import { Prisma, prisma } from '@nms/db';

type AuditInput = {
  userId?: string | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  meta?: unknown;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      meta:
        input.meta === undefined
          ? undefined
          : input.meta === null
            ? Prisma.JsonNull
            : (input.meta as Prisma.InputJsonValue),
    },
  });
}
