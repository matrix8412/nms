import { prisma } from '@nms/db';
import type { SessionUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/errors';

export async function listGroups(session: NonNullable<SessionUser>) {
  if (session.user.role === 'ADMIN') {
    return prisma.group.findMany({ orderBy: { name: 'asc' } });
  }

  const groupIds = session.user.groupMemberships.map((membership) => membership.groupId);
  return prisma.group.findMany({
    where: { id: { in: groupIds } },
    orderBy: { name: 'asc' },
  });
}

export async function getGroupById(id: string, session: NonNullable<SessionUser>) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, role: true, emailVerifiedAt: true },
          },
        },
      },
    },
  });

  if (!group) {
    throw new ApiError(404, 'NOT_FOUND', 'Group not found');
  }

  if (
    session.user.role !== 'ADMIN' &&
    !group.members.some((membership) => membership.userId === session.user.id)
  ) {
    throw new ApiError(403, 'FORBIDDEN', 'Group access denied');
  }

  return group;
}

export async function createGroup(name: string) {
  return prisma.group.create({ data: { name } });
}

export async function updateGroup(id: string, data: { name?: string }) {
  return prisma.group.update({
    where: { id },
    data,
  });
}

export async function deleteGroup(id: string) {
  await prisma.group.delete({ where: { id } });
  return { ok: true };
}
