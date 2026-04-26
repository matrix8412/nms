import { Prisma, prisma } from '@nms/db';
import type { DeviceInterfaceDto } from '@nms/shared';
import snmp from 'net-snmp';

type BuiltinSnmpMetricKey =
  | 'hostname'
  | 'softwareVersion'
  | 'uptime'
  | 'ifOperStatus'
  | 'ifName'
  | 'ifDescription'
  | 'ifMac';

type SnmpMetricKey = BuiltinSnmpMetricKey | (string & {});

type SnmpTemplateConfig = {
  oid: string;
  intervalSec: number;
};

type ResolvedSnmpTemplates = Record<BuiltinSnmpMetricKey, SnmpTemplateConfig> & Record<string, SnmpTemplateConfig>;

type SnmpConfig = {
  ip: string;
  port: number;
  version: 'V2C' | 'V3';
  community?: string | null;
  username?: string | null;
  authProtocol?: 'MD5' | 'SHA' | null;
  authPassword?: string | null;
  privProtocol?: 'DES' | 'AES' | null;
  privPassword?: string | null;
};

type SnmpPollMetric = {
  templateKey: SnmpMetricKey;
  itemKey: string;
  itemName: string;
  valueNumeric: number | null;
  valueText: string | null;
  metadata?: Prisma.InputJsonValue;
};

export type SnmpPollResult = {
  hostname: string | null;
  softwareVersion: string | null;
  uptimeTicks: number | null;
  interfaces: DeviceInterfaceDto[];
  metrics: SnmpPollMetric[];
  metricIntervals: Record<string, number>;
};

const DEFAULT_TEMPLATE_CONFIGS: Record<BuiltinSnmpMetricKey, SnmpTemplateConfig> = {
  hostname: { oid: '1.3.6.1.2.1.1.5.0', intervalSec: 1800 },
  softwareVersion: { oid: '1.3.6.1.2.1.1.1.0', intervalSec: 1800 },
  uptime: { oid: '1.3.6.1.2.1.1.3.0', intervalSec: 300 },
  ifOperStatus: { oid: '1.3.6.1.2.1.2.2.1.8', intervalSec: 300 },
  ifName: { oid: '1.3.6.1.2.1.31.1.1.1.1', intervalSec: 1800 },
  ifDescription: { oid: '1.3.6.1.2.1.2.2.1.2', intervalSec: 1800 },
  ifMac: { oid: '1.3.6.1.2.1.2.2.1.6', intervalSec: 1800 },
};

const BUILTIN_TEMPLATE_KEYS = new Set<string>(Object.keys(DEFAULT_TEMPLATE_CONFIGS));

const OPER_STATUS_MAP: Record<number, string> = {
  1: 'up',
  2: 'down',
  3: 'testing',
  4: 'unknown',
  5: 'dormant',
  6: 'notPresent',
  7: 'lowerLayerDown',
};

async function resolveMetricTemplates(vendor?: string | null, deviceType?: string | null): Promise<ResolvedSnmpTemplates> {
  const rows = await prisma.snmpOidTemplate.findMany({
    where: {
      enabled: true,
      OR: [
        { vendor: vendor ?? undefined, deviceType: deviceType ?? undefined },
        { vendor: null, deviceType: deviceType ?? undefined },
        { vendor: vendor ?? undefined, deviceType: null },
        { vendor: null, deviceType: null },
      ],
    },
  });

  const map: ResolvedSnmpTemplates = { ...DEFAULT_TEMPLATE_CONFIGS };
  const bestByMetric = new Map<string, { config: SnmpTemplateConfig; score: number }>();

  for (const row of rows) {
    const metricKey = row.metricKey;
    const score = (row.vendor ? 2 : 0) + (row.deviceType ? 1 : 0);
    const current = bestByMetric.get(metricKey);
    if (!current || score > current.score) {
      bestByMetric.set(metricKey, {
        config: {
          oid: row.oid,
          intervalSec: row.intervalSec,
        },
        score,
      });
    }
  }

  for (const [metricKey, candidate] of bestByMetric.entries()) {
    map[metricKey] = candidate.config;
  }

  return map;
}

function formatCustomMetricLabel(metricKey: string): string {
  return metricKey
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function bufferToMac(value: Buffer): string {
  return Array.from(value)
    .map((item) => item.toString(16).padStart(2, '0'))
    .join(':');
}

function stringifyValue(value: unknown): string | null {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8').replace(/\0/g, '').trim() || null;
  }
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  const parsed = Number(stringifyValue(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractIndex(baseOid: string, oid: string): number | null {
  const prefix = `${baseOid}.`;
  if (!oid.startsWith(prefix)) {
    return null;
  }
  const suffix = oid.slice(prefix.length);
  if (!suffix || suffix.includes('.')) {
    return null;
  }
  const index = Number(suffix);
  return Number.isInteger(index) ? index : null;
}

function createSession(config: SnmpConfig) {
  const options = {
    port: config.port,
    retries: 1,
    timeout: 5000,
    backoff: 1,
  };

  if (config.version === 'V2C') {
    if (!config.community) {
      throw new Error('SNMP v2c community is missing');
    }
    return snmp.createSession(config.ip, config.community, {
      ...options,
      version: snmp.Version2c,
    });
  }

  if (!config.username || !config.authProtocol || !config.authPassword) {
    throw new Error('SNMP v3 username and auth credentials are missing');
  }

  const hasPrivacy = Boolean(config.privProtocol && config.privPassword);
  return snmp.createV3Session(
    config.ip,
    {
      name: config.username,
      level: hasPrivacy ? snmp.SecurityLevel.authPriv : snmp.SecurityLevel.authNoPriv,
      authProtocol: config.authProtocol === 'SHA' ? snmp.AuthProtocols.sha : snmp.AuthProtocols.md5,
      authKey: config.authPassword,
      privProtocol: hasPrivacy
        ? config.privProtocol === 'AES'
          ? snmp.PrivProtocols.aes
          : snmp.PrivProtocols.des
        : undefined,
      privKey: hasPrivacy ? config.privPassword ?? undefined : undefined,
    },
    options,
  );
}

function getScalar(session: snmp.Session, oid: string): Promise<unknown | null> {
  return new Promise((resolve, reject) => {
    session.get([oid], (error, varbinds) => {
      if (error) {
        reject(error);
        return;
      }

      const varbind = varbinds?.[0];
      if (!varbind || snmp.isVarbindError(varbind)) {
        resolve(null);
        return;
      }

      resolve(varbind.value ?? null);
    });
  });
}

function walkColumn(session: snmp.Session, baseOid: string): Promise<Map<number, unknown>> {
  return new Promise((resolve, reject) => {
    const results = new Map<number, unknown>();

    session.subtree(
      baseOid,
      20,
      (varbinds) => {
        for (const varbind of varbinds) {
          if (snmp.isVarbindError(varbind)) {
            continue;
          }
          const index = extractIndex(baseOid, varbind.oid);
          if (index !== null) {
            results.set(index, varbind.value);
          }
        }
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(results);
      },
    );
  });
}

export async function pollSnmpDevice(
  config: SnmpConfig,
  vendor?: string | null,
  deviceType?: string | null,
): Promise<SnmpPollResult> {
  const templates = await resolveMetricTemplates(vendor, deviceType);
  const session = createSession(config);

  try {
    const customMetricEntries = Object.entries(templates).filter(([metricKey]) => !BUILTIN_TEMPLATE_KEYS.has(metricKey));

    const [hostnameValue, softwareVersionValue, uptimeValue, operStatuses, names, descriptions, macs, ...customValues] = await Promise.all([
      getScalar(session, templates.hostname.oid),
      getScalar(session, templates.softwareVersion.oid),
      getScalar(session, templates.uptime.oid),
      walkColumn(session, templates.ifOperStatus.oid),
      walkColumn(session, templates.ifName.oid),
      walkColumn(session, templates.ifDescription.oid),
      walkColumn(session, templates.ifMac.oid),
      ...customMetricEntries.map(([, template]) => getScalar(session, template.oid)),
    ]);

    const hostname = stringifyValue(hostnameValue);
    const softwareVersion = stringifyValue(softwareVersionValue);
    const uptimeTicks = numberValue(uptimeValue);

    const indexes = new Set<number>([
      ...operStatuses.keys(),
      ...names.keys(),
      ...descriptions.keys(),
      ...macs.keys(),
    ]);

    const interfaces = Array.from(indexes)
      .sort((left, right) => left - right)
      .map((index) => {
        const name = stringifyValue(names.get(index)) ?? stringifyValue(descriptions.get(index)) ?? `if${index}`;
        const macValue = macs.get(index);
        const operCode = numberValue(operStatuses.get(index));

        return {
          index,
          name,
          description: stringifyValue(descriptions.get(index)),
          mac: Buffer.isBuffer(macValue) ? bufferToMac(macValue) : stringifyValue(macValue),
          operStatus: operCode != null ? (OPER_STATUS_MAP[operCode] ?? String(operCode)) : null,
        } satisfies DeviceInterfaceDto;
      });

    const metrics: SnmpPollMetric[] = [
      {
        templateKey: 'hostname' as const,
        itemKey: 'snmp.hostname',
        itemName: 'Hostname',
        valueNumeric: null,
        valueText: hostname,
      },
      {
        templateKey: 'softwareVersion' as const,
        itemKey: 'snmp.softwareVersion',
        itemName: 'Software Version',
        valueNumeric: null,
        valueText: softwareVersion,
      },
      {
        templateKey: 'uptime' as const,
        itemKey: 'snmp.uptimeTicks',
        itemName: 'Uptime',
        valueNumeric: uptimeTicks,
        valueText: uptimeTicks != null ? String(uptimeTicks) : null,
      },
      ...interfaces.map((item) => ({
        templateKey: 'ifOperStatus' as const,
        itemKey: `snmp.interface.${item.index}.operStatus`,
        itemName: `${item.name} oper status`,
        valueNumeric: null,
        valueText: item.operStatus ?? null,
        metadata: {
          index: item.index,
          description: item.description,
          mac: item.mac,
        },
      })),
      ...customMetricEntries.map(([metricKey], index) => {
        const rawValue = customValues[index] ?? null;
        return {
          templateKey: metricKey,
          itemKey: `snmp.custom.${metricKey}`,
          itemName: formatCustomMetricLabel(metricKey),
          valueNumeric: numberValue(rawValue),
          valueText: stringifyValue(rawValue),
        } satisfies SnmpPollMetric;
      }),
    ].filter((item) => item.valueNumeric != null || item.valueText != null);

    return {
      hostname,
      softwareVersion,
      uptimeTicks,
      interfaces,
      metrics,
      metricIntervals: Object.fromEntries(Object.entries(templates).map(([metricKey, template]) => [metricKey, template.intervalSec])),
    };
  } finally {
    session.close();
  }
}