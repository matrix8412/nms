import { Prisma, prisma } from '@nms/db';
import { decryptSecretOrNull } from '@nms/shared/secrets';
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
    const customMatch = /^snmp\.interface\.\d+\.custom\.(.+)$/.exec(itemKey);
    if (customMatch?.[1]) {
      return customMatch[1];
    }
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

export async function syncDevice(deviceId: string, force = false) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: {
      id: true,
      ip: true,
      vendor: true,
      type: true,
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
