import { prisma } from '@nms/db';
import type { SessionUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/errors';

export async function listDeviceGroups(session: NonNullable<SessionUser>) {
  if (session.user.role === 'ADMIN') {
    return prisma.deviceGroup.findMany({
      include: {
        access: true,
        _count: { select: { devices: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  const userGroupIds = session.user.groupMemberships.map((membership) => membership.groupId);
  return prisma.deviceGroup.findMany({
    where: {
      access: {
        some: {
          groupId: { in: userGroupIds },
        },
      },
    },
    include: {
      access: true,
      _count: { select: { devices: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getDeviceGroupById(id: string, session: NonNullable<SessionUser>) {
  const group = await prisma.deviceGroup.findUnique({
    where: { id },
    include: {
      access: true,
      devices: {
        select: {
          device: {
            select: {
              id: true,
              name: true,
              ip: true,
            },
          },
        },
      },
    },
  });
  if (!group) {
    throw new ApiError(404, 'NOT_FOUND', 'Device group not found');
  }
  if (session.user.role === 'ADMIN') {
    return group;
  }
  const userGroupIds = new Set(session.user.groupMemberships.map((membership) => membership.groupId));
  const allowed = group.access.some((item) => userGroupIds.has(item.groupId));
  if (!allowed) {
    throw new ApiError(403, 'FORBIDDEN', 'Device group access denied');
  }
  return group;
}

export async function createDeviceGroup(data: {
  name: string;
  description?: string | null;
  allowedGroupIds: string[];
}) {
  return prisma.deviceGroup.create({
    data: {
      name: data.name,
      description: data.description,
      access: {
        create: data.allowedGroupIds.map((groupId) => ({ groupId })),
      },
    },
    include: { access: true },
  });
}

export async function updateDeviceGroup(
  id: string,
  data: Partial<{ name: string; description?: string | null; allowedGroupIds: string[] }>,
) {
  await prisma.$transaction(async (tx) => {
    await tx.deviceGroup.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });

    if (data.allowedGroupIds) {
      await tx.groupDeviceAccess.deleteMany({ where: { deviceGroupId: id } });
      if (data.allowedGroupIds.length > 0) {
        await tx.groupDeviceAccess.createMany({
          data: data.allowedGroupIds.map((groupId) => ({
            groupId,
            deviceGroupId: id,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  return prisma.deviceGroup.findUnique({
    where: { id },
    include: { access: true },
  });
}

export async function deleteDeviceGroup(id: string) {
  await prisma.deviceGroup.delete({ where: { id } });
  return { ok: true };
}
