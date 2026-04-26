import { Prisma, prisma } from '@nms/db';
import type { DeviceInterfaceDto } from '@nms/shared';
import snmp from 'net-snmp';

type SnmpMetricKey =
  | 'hostname'
  | 'softwareVersion'
  | 'uptime'
  | 'ifOperStatus'
  | 'ifName'
  | 'ifDescription'
  | 'ifMac';

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
};

const DEFAULT_OIDS: Record<SnmpMetricKey, string> = {
  hostname: '1.3.6.1.2.1.1.5.0',
  softwareVersion: '1.3.6.1.2.1.1.1.0',
  uptime: '1.3.6.1.2.1.1.3.0',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  ifName: '1.3.6.1.2.1.31.1.1.1.1',
  ifDescription: '1.3.6.1.2.1.2.2.1.2',
  ifMac: '1.3.6.1.2.1.2.2.1.6',
};

const OPER_STATUS_MAP: Record<number, string> = {
  1: 'up',
  2: 'down',
  3: 'testing',
  4: 'unknown',
  5: 'dormant',
  6: 'notPresent',
  7: 'lowerLayerDown',
};

async function resolveOidMap(vendor?: string | null, deviceType?: string | null) {
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

  const map = { ...DEFAULT_OIDS };
  const bestByMetric = new Map<SnmpMetricKey, { oid: string; score: number }>();

  for (const row of rows) {
    if (!(row.metricKey in map)) {
      continue;
    }

    const metricKey = row.metricKey as SnmpMetricKey;
    const score = (row.vendor ? 2 : 0) + (row.deviceType ? 1 : 0);
    const current = bestByMetric.get(metricKey);
    if (!current || score > current.score) {
      bestByMetric.set(metricKey, { oid: row.oid, score });
    }
  }

  for (const [metricKey, candidate] of bestByMetric.entries()) {
    map[metricKey] = candidate.oid;
  }

  return map;
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
  const oids = await resolveOidMap(vendor, deviceType);
  const session = createSession(config);

  try {
    const [hostnameValue, softwareVersionValue, uptimeValue, operStatuses, names, descriptions, macs] = await Promise.all([
      getScalar(session, oids.hostname),
      getScalar(session, oids.softwareVersion),
      getScalar(session, oids.uptime),
      walkColumn(session, oids.ifOperStatus),
      walkColumn(session, oids.ifName),
      walkColumn(session, oids.ifDescription),
      walkColumn(session, oids.ifMac),
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
        itemKey: 'snmp.hostname',
        itemName: 'Hostname',
        valueNumeric: null,
        valueText: hostname,
      },
      {
        itemKey: 'snmp.softwareVersion',
        itemName: 'Software Version',
        valueNumeric: null,
        valueText: softwareVersion,
      },
      {
        itemKey: 'snmp.uptimeTicks',
        itemName: 'Uptime',
        valueNumeric: uptimeTicks,
        valueText: uptimeTicks != null ? String(uptimeTicks) : null,
      },
      ...interfaces.map((item) => ({
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
    ].filter((item) => item.valueNumeric != null || item.valueText != null);

    return {
      hostname,
      softwareVersion,
      uptimeTicks,
      interfaces,
      metrics,
    };
  } finally {
    session.close();
  }
}