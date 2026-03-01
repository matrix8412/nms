import { Prisma, prisma } from '@nms/db';
import type { DeviceDto } from '@nms/shared';
import type { SessionUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/errors';

function toDeviceDto(
  device: {
    id: string;
    name: string;
    ip: string;
    vendor: string | null;
    type: string | null;
    zabbixHostId: string | null;
    icmpStatus: string;
    lastPingAt: Date | null;
    lastPingDuration: number | null;
  },
  groupIds: string[],
): DeviceDto {
  return {
    id: device.id,
    name: device.name,
    ip: device.ip,
    vendor: device.vendor,
    type: device.type,
    zabbixHostId: device.zabbixHostId,
    icmpStatus: device.icmpStatus as DeviceDto['icmpStatus'],
    lastPingAt: device.lastPingAt?.toISOString() ?? null,
    lastPingDuration: device.lastPingDuration,
    groupIds,
  };
}

async function resolveAllowedGroupIds(session: NonNullable<SessionUser>): Promise<string[]> {
  if (session.user.role === 'ADMIN') {
    return [];
  }
  return session.user.groupMemberships.map((membership) => membership.groupId);
}

async function mapGroupIds(deviceIds: string[]) {
  const rels = await prisma.deviceGroupDevice.findMany({
    where: { deviceId: { in: deviceIds } },
    select: { deviceId: true, deviceGroupId: true },
  });

  const map = new Map<string, string[]>();
  for (const rel of rels) {
    const existing = map.get(rel.deviceId) ?? [];
    existing.push(rel.deviceGroupId);
    map.set(rel.deviceId, existing);
  }
  return map;
}

export async function listDevices(session: NonNullable<SessionUser>, search?: string | null) {
  const userGroupIds = await resolveAllowedGroupIds(session);
  const normalizedSearch = search?.trim();

  let devices: Array<{
    id: string;
    name: string;
    ip: string;
    vendor: string | null;
    type: string | null;
    zabbixHostId: string | null;
    icmpStatus: string;
    lastPingAt: Date | null;
    lastPingDuration: number | null;
  }> = [];

  if (normalizedSearch) {
    const searchPattern = `%${normalizedSearch}%`;
    if (session.user.role === 'ADMIN') {
      devices = await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          ip: string;
          vendor: string | null;
          type: string | null;
          zabbixHostId: string | null;
          icmpStatus: string;
          lastPingAt: Date | null;
          lastPingDuration: number | null;
        }>
      >(
        Prisma.sql`
          SELECT d."id", d."name", d."ip", d."vendor", d."type", d."zabbixHostId",
                 d."icmpStatus"::text, d."lastPingAt", d."lastPingDuration"
          FROM "Device" d
          WHERE unaccent(lower(d."name")) LIKE unaccent(lower(${searchPattern}))
             OR unaccent(lower(d."ip")) LIKE unaccent(lower(${searchPattern}))
             OR unaccent(lower(COALESCE(d."vendor", ''))) LIKE unaccent(lower(${searchPattern}))
             OR unaccent(lower(COALESCE(d."type", ''))) LIKE unaccent(lower(${searchPattern}))
          ORDER BY d."name" ASC
        `,
      );
    } else if (userGroupIds.length > 0) {
      devices = await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          ip: string;
          vendor: string | null;
          type: string | null;
          zabbixHostId: string | null;
          icmpStatus: string;
          lastPingAt: Date | null;
          lastPingDuration: number | null;
        }>
      >(
        Prisma.sql`
          SELECT DISTINCT d."id", d."name", d."ip", d."vendor", d."type", d."zabbixHostId",
                 d."icmpStatus"::text, d."lastPingAt", d."lastPingDuration"
          FROM "Device" d
          JOIN "DeviceGroupDevice" dgd ON dgd."deviceId" = d."id"
          JOIN "GroupDeviceAccess" gda ON gda."deviceGroupId" = dgd."deviceGroupId"
          WHERE gda."groupId" IN (${Prisma.join(userGroupIds)})
            AND (
              unaccent(lower(d."name")) LIKE unaccent(lower(${searchPattern}))
              OR unaccent(lower(d."ip")) LIKE unaccent(lower(${searchPattern}))
              OR unaccent(lower(COALESCE(d."vendor", ''))) LIKE unaccent(lower(${searchPattern}))
              OR unaccent(lower(COALESCE(d."type", ''))) LIKE unaccent(lower(${searchPattern}))
            )
          ORDER BY d."name" ASC
        `,
      );
    }
  } else {
    devices = await prisma.device.findMany({
      where:
        session.user.role === 'ADMIN'
          ? undefined
          : {
              groups: {
                some: {
                  deviceGroup: {
                    access: {
                      some: {
                        groupId: { in: userGroupIds },
                      },
                    },
                  },
                },
              },
            },
      select: {
        id: true,
        name: true,
        ip: true,
        vendor: true,
        type: true,
        zabbixHostId: true,
        icmpStatus: true,
        lastPingAt: true,
        lastPingDuration: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  const groupMap = await mapGroupIds(devices.map((device) => device.id));
  return devices.map((device) => toDeviceDto(device, groupMap.get(device.id) ?? []));
}

export async function canReadDevice(
  deviceId: string,
  session: NonNullable<SessionUser>,
): Promise<boolean> {
  if (session.user.role === 'ADMIN') {
    return true;
  }
  const userGroupIds = session.user.groupMemberships.map((membership) => membership.groupId);
  if (userGroupIds.length === 0) {
    return false;
  }
  const count = await prisma.deviceGroupDevice.count({
    where: {
      deviceId,
      deviceGroup: {
        access: {
          some: {
            groupId: { in: userGroupIds },
          },
        },
      },
    },
  });
  return count > 0;
}

export async function getDeviceById(deviceId: string, session: NonNullable<SessionUser>) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      groups: {
        select: {
          deviceGroupId: true,
        },
      },
      metrics: {
        orderBy: { recordedAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!device) {
    throw new ApiError(404, 'NOT_FOUND', 'Device not found');
  }

  if (!(await canReadDevice(device.id, session))) {
    throw new ApiError(403, 'FORBIDDEN', 'Device access denied');
  }

  return {
    ...toDeviceDto(
      {
        id: device.id,
        name: device.name,
        ip: device.ip,
        vendor: device.vendor,
        type: device.type,
        zabbixHostId: device.zabbixHostId,
        icmpStatus: device.icmpStatus,
        lastPingAt: device.lastPingAt,
        lastPingDuration: device.lastPingDuration,
      },
      device.groups.map((item) => item.deviceGroupId),
    ),
    metrics: device.metrics,
  };
}

export async function createDevice(data: {
  name: string;
  ip: string;
  vendor?: string | null;
  type?: string | null;
  zabbixHostId?: string | null;
  deviceGroupIds: string[];
}) {
  const device = await prisma.device.create({
    data: {
      name: data.name,
      ip: data.ip,
      vendor: data.vendor,
      type: data.type,
      zabbixHostId: data.zabbixHostId,
      groups: {
        create: data.deviceGroupIds.map((deviceGroupId) => ({
          deviceGroupId,
        })),
      },
    },
    include: { groups: true },
  });

  return toDeviceDto(device, device.groups.map((item) => item.deviceGroupId));
}

export async function updateDevice(
  id: string,
  data: Partial<{
    name: string;
    ip: string;
    vendor?: string | null;
    type?: string | null;
    zabbixHostId?: string | null;
    deviceGroupIds: string[];
  }>,
) {
  await prisma.$transaction(async (tx) => {
    await tx.device.update({
      where: { id },
      data: {
        name: data.name,
        ip: data.ip,
        vendor: data.vendor,
        type: data.type,
        zabbixHostId: data.zabbixHostId,
      },
    });

    if (data.deviceGroupIds) {
      await tx.deviceGroupDevice.deleteMany({
        where: { deviceId: id },
      });
      if (data.deviceGroupIds.length > 0) {
        await tx.deviceGroupDevice.createMany({
          data: data.deviceGroupIds.map((deviceGroupId) => ({
            deviceId: id,
            deviceGroupId,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  const updated = await prisma.device.findUnique({
    where: { id },
    include: { groups: true },
  });

  if (!updated) {
    throw new ApiError(404, 'NOT_FOUND', 'Device not found');
  }

  return toDeviceDto(updated, updated.groups.map((item) => item.deviceGroupId));
}

export async function deleteDevice(id: string) {
  await prisma.device.delete({ where: { id } });
  return { ok: true };
}
