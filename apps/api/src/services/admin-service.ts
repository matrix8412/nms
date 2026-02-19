import { prisma } from '@nms/db';
import { ApiError } from '@/lib/errors';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      groupMemberships: {
        include: {
          group: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}

export async function updateUserAdmin(
  userId: string,
  data: Partial<{ role: 'USER' | 'ADMIN'; groupIds: string[] }>,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  await prisma.$transaction(async (tx) => {
    if (data.role) {
      await tx.user.update({
        where: { id: userId },
        data: { role: data.role },
      });
    }

    if (data.groupIds) {
      await tx.groupMember.deleteMany({ where: { userId } });
      if (data.groupIds.length > 0) {
        await tx.groupMember.createMany({
          data: data.groupIds.map((groupId) => ({ userId, groupId })),
          skipDuplicates: true,
        });
      }
    }
  });

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      groupMemberships: {
        include: {
          group: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}
