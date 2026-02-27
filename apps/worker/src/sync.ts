import { prisma } from '@nms/db';
import { ZabbixClient } from './zabbix.js';
import { env } from './env.js';

const DEFAULT_KEYS_BY_TYPE: Record<string, string[]> = {
  default: ['system.cpu.load[percpu,avg1]', 'vm.memory.size[available]', 'icmpping'],
  router: ['net.if.in[ifHCInOctets.1]', 'net.if.out[ifHCOutOctets.1]', 'icmpping'],
  switch: ['net.if.in[ifHCInOctets.1]', 'net.if.out[ifHCOutOctets.1]', 'icmpping'],
};

function parseNumeric(value: string): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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

  return (
    DEFAULT_KEYS_BY_TYPE[(deviceType ?? 'default').toLowerCase()] ?? DEFAULT_KEYS_BY_TYPE.default ?? []
  );
}

export async function syncDevice(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { id: true, zabbixHostId: true, vendor: true, type: true },
  });
  if (!device?.zabbixHostId) return;

  if (!env.ZABBIX_URL || !env.ZABBIX_USER || !env.ZABBIX_PASS) {
    return;
  }
  const client = new ZabbixClient(`${env.ZABBIX_URL}/api_jsonrpc.php`, env.ZABBIX_USER, env.ZABBIX_PASS);

  const itemKeys = await resolveItemKeys(device.vendor, device.type);
  const items = await client.itemGet(device.zabbixHostId, itemKeys);
  if (items.length === 0) return;

  await prisma.deviceMetric.createMany({
    data: items.map((item) => ({
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
  });
}
