import { prisma } from '@nms/db';
import { createZabbixClient } from '@/lib/zabbix/client';
import { resolveItemKeysForDevice } from '@/lib/zabbix/mapping';

function parseNumeric(value: string): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function syncDeviceFromZabbix(deviceId: string): Promise<void> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: {
      id: true,
      zabbixHostId: true,
      vendor: true,
      type: true,
    },
  });

  if (!device?.zabbixHostId) {
    return;
  }

  const client = createZabbixClient();
  const itemKeys = await resolveItemKeysForDevice(device.vendor, device.type);
  const host = await client.hostGet(device.zabbixHostId);
  if (!host) {
    return;
  }

  const items = await client.itemGet(device.zabbixHostId, itemKeys);
  if (items.length === 0) {
    return;
  }

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
