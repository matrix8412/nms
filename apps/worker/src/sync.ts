import { Prisma, prisma } from '@nms/db';
import { decryptSecretOrNull } from '@nms/shared/secrets';
import { ZabbixClient } from './zabbix.js';
import { env } from './env.js';
import { pollSnmpDevice } from './snmp.js';

type SnmpTemplateKey = string;

const DEFAULT_SNMP_INTERVAL_SEC = 1800;

async function loadLastSnmpMetricTimes(deviceId: string) {
  const latestMetrics = await prisma.deviceMetric.findMany({
    where: {
      deviceId,
      source: 'snmp',
      itemKey: { startsWith: 'snmp.' },
    },
    select: {
      itemKey: true,
      recordedAt: true,
    },
    orderBy: {
      recordedAt: 'desc',
    },
  });

  const timestamps: Partial<Record<SnmpTemplateKey, Date>> = {};
  for (const metric of latestMetrics) {
    const templateKey = getMetricTimestampKey(metric.itemKey);
    if (templateKey && !timestamps[templateKey]) {
      timestamps[templateKey] = metric.recordedAt;
    }
  }

  return timestamps;
}

function getMetricTimestampKey(itemKey: string): string | null {
  if (itemKey === 'snmp.hostname') {
    return 'hostname';
  }
  if (itemKey === 'snmp.softwareVersion') {
    return 'softwareVersion';
  }
  if (itemKey === 'snmp.uptimeTicks') {
    return 'uptime';
  }
  if (itemKey.startsWith('snmp.interface.')) {
    return 'ifOperStatus';
  }
  if (itemKey.startsWith('snmp.custom.')) {
    return itemKey.slice('snmp.custom.'.length) || null;
  }
  return null;
}

function isMetricDue(lastRecordedAt: Date | undefined, intervalSec: number, now: Date) {
  if (!lastRecordedAt) {
    return true;
  }
  return now.getTime() - lastRecordedAt.getTime() >= intervalSec * 1000;
}

const DEFAULT_KEYS_BY_TYPE: Record<string, string[]> = {
  default: ['system.cpu.load[percpu,avg1]', 'vm.memory.size[available]', 'icmpping'],
  router: ['net.if.in[ifHCInOctets.1]', 'net.if.out[ifHCOutOctets.1]', 'icmpping'],
  switch: ['net.if.in[ifHCInOctets.1]', 'net.if.out[ifHCOutOctets.1]', 'icmpping'],
};

function parseNumeric(value: string): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toApiUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/api_jsonrpc.php') ? trimmed : `${trimmed.replace(/\/+$/, '')}/api_jsonrpc.php`;
}

async function resolveZabbixConnection() {
  const integration = await prisma.integrationConfig.findUnique({
    where: { provider: 'zabbix' },
    select: { enabled: true, settings: true },
  });

  const settings = integration?.settings && typeof integration.settings === 'object'
    ? integration.settings as Record<string, unknown>
    : null;

  const url = toApiUrl(String(settings?.url ?? ''));
  const token = String(settings?.apiToken ?? '').trim();

  if (integration?.enabled && url && token) {
    return { url, token, user: '', pass: '' };
  }

  if (env.ZABBIX_URL && env.ZABBIX_USER && env.ZABBIX_PASS) {
    return { url: `${env.ZABBIX_URL}/api_jsonrpc.php`, token: '', user: env.ZABBIX_USER, pass: env.ZABBIX_PASS };
  }

  return null;
}

async function resolveItemKeys(vendor?: string | null, deviceType?: string | null) {
  const rows = await prisma.zabbixItemMapping.findMany({
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

  if (rows.length > 0) {
    return [...new Set(rows.map((item: { itemKey: string }) => item.itemKey))];
  }

  if (vendor) {
    const vendorRows = await prisma.zabbixItemMapping.findMany({
      where: {
        enabled: true,
        vendor,
      },
      orderBy: [{ deviceType: 'desc' }, { itemKey: 'asc' }],
    });

    if (vendorRows.length > 0) {
      return [...new Set(vendorRows.map((item: { itemKey: string }) => item.itemKey))];
    }
  }

  return (
    DEFAULT_KEYS_BY_TYPE[(deviceType ?? 'default').toLowerCase()] ?? DEFAULT_KEYS_BY_TYPE.default ?? []
  );
}

export async function syncDevice(deviceId: string, force = false) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: {
      id: true,
      ip: true,
      vendor: true,
      type: true,
      zabbixHostId: true,
      snmpVersion: true,
      snmpPort: true,
      snmpCommunity: true,
      snmpUsername: true,
      snmpAuthProtocol: true,
      snmpAuthPassword: true,
      snmpPrivProtocol: true,
      snmpPrivPassword: true,
    },
  });
  if (!device) return;

  const metrics: Prisma.DeviceMetricCreateManyInput[] = [];
  const zabbixMetrics: Prisma.DeviceMetricCreateManyInput[] = [];

  if (device.zabbixHostId) {
    const zabbixConnection = await resolveZabbixConnection();
    if (zabbixConnection) {
      const client = new ZabbixClient(
        zabbixConnection.url,
        zabbixConnection.user,
        zabbixConnection.pass,
        zabbixConnection.token,
      );

      const itemKeys = await resolveItemKeys(device.vendor, device.type);
      const items = await client.itemGet(device.zabbixHostId, itemKeys);
      zabbixMetrics.push(
        ...items.map((item) => ({
          deviceId: device.id,
          source: 'zabbix',
          itemKey: item.key_,
          itemName: item.name,
          valueNumeric: parseNumeric(item.lastvalue),
          valueText: item.lastvalue,
          recordedAt: item.lastclock ? new Date(Number(item.lastclock) * 1000) : new Date(),
          metadata: {
            zabbixItemId: item.itemid,
            units: item.units,
          },
        })),
      );
    }
  }

  if (zabbixMetrics.length > 0) {
    const zabbixItemKeys = [...new Set(zabbixMetrics.map((metric) => metric.itemKey))];
    await prisma.$transaction([
      prisma.deviceMetric.deleteMany({
        where: {
          deviceId: device.id,
          source: 'zabbix',
          itemKey: { in: zabbixItemKeys },
        },
      }),
      prisma.deviceMetric.createMany({
        data: zabbixMetrics,
      }),
    ]);
  }

  if (device.snmpVersion) {
    try {
      const result = await pollSnmpDevice(
        {
          ip: device.ip,
          port: device.snmpPort,
          version: device.snmpVersion,
          community: decryptSecretOrNull(device.snmpCommunity, env.ENCRYPTION_KEY),
          username: device.snmpUsername,
          authProtocol: device.snmpAuthProtocol,
          authPassword: decryptSecretOrNull(device.snmpAuthPassword, env.ENCRYPTION_KEY),
          privProtocol: device.snmpPrivProtocol,
          privPassword: decryptSecretOrNull(device.snmpPrivPassword, env.ENCRYPTION_KEY),
        },
        device.vendor,
        device.type,
      );

      await prisma.device.update({
        where: { id: device.id },
        data: {
          snmpStatus: 'UP',
          snmpLastSyncAt: new Date(),
          snmpLastError: null,
          snmpHostname: result.hostname,
          snmpSoftwareVersion: result.softwareVersion,
          snmpUptimeTicks: result.uptimeTicks,
          snmpInterfaces: result.interfaces as unknown as Prisma.InputJsonValue,
        },
      });

      const recordedAt = new Date();
      const lastSnmpMetricTimes = await loadLastSnmpMetricTimes(device.id);

      metrics.push(
        ...result.metrics
          .filter((item) =>
            force ||
            isMetricDue(
              lastSnmpMetricTimes[item.templateKey],
              result.metricIntervals[item.templateKey] ?? DEFAULT_SNMP_INTERVAL_SEC,
              recordedAt,
            ),
          )
          .map((item) => ({
            deviceId: device.id,
            source: 'snmp',
            itemKey: item.itemKey,
            itemName: item.itemName,
            valueNumeric: item.valueNumeric,
            valueText: item.valueText,
            recordedAt,
            metadata: item.metadata,
          })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SNMP poll failed';
      await prisma.device.update({
        where: { id: device.id },
        data: {
          snmpStatus: 'DOWN',
          snmpLastSyncAt: new Date(),
          snmpLastError: message,
        },
      });
    }
  }

  if (metrics.length === 0) return;

  await prisma.deviceMetric.createMany({
    data: metrics,
  });
}
