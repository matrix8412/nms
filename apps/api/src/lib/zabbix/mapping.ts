import { prisma } from '@nms/db';

const DEFAULT_KEYS_BY_TYPE: Record<string, string[]> = {
  default: ['system.cpu.load[percpu,avg1]', 'vm.memory.size[available]', 'icmpping'],
  router: ['net.if.in[ifHCInOctets.1]', 'net.if.out[ifHCOutOctets.1]', 'icmpping'],
  switch: ['net.if.in[ifHCInOctets.1]', 'net.if.out[ifHCOutOctets.1]', 'icmpping'],
};

export async function resolveItemKeysForDevice(
  vendor?: string | null,
  deviceType?: string | null,
): Promise<string[]> {
  const mappings = await prisma.zabbixItemMapping.findMany({
    where: {
      enabled: true,
      OR: [
        { vendor: vendor ?? undefined, deviceType: deviceType ?? undefined },
        { vendor: null, deviceType: deviceType ?? undefined },
        { vendor: vendor ?? undefined, deviceType: null },
        { vendor: null, deviceType: null },
      ],
    },
    orderBy: [{ vendor: 'desc' }, { deviceType: 'desc' }, { itemKey: 'asc' }],
  });

  const configured = mappings.map((item) => item.itemKey);
  if (configured.length > 0) {
    return [...new Set(configured)];
  }

  const key = (deviceType ?? 'default').toLowerCase();
  return DEFAULT_KEYS_BY_TYPE[key] ?? DEFAULT_KEYS_BY_TYPE.default ?? [];
}
