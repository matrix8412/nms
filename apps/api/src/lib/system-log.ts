import { Prisma, prisma } from '@nms/db';

type SystemLogLevel = 'INFO' | 'WARN' | 'ERROR';

type SystemLogInput = {
  category: string;
  message: string;
  level?: SystemLogLevel;
  meta?: unknown;
};

export async function writeSystemLog(input: SystemLogInput): Promise<void> {
  const level = input.level ?? 'INFO';
  const action = `SYSTEM.${input.category}.${level}`;
  const payload =
    input.meta === undefined
      ? undefined
      : input.meta === null
        ? Prisma.JsonNull
        : (input.meta as Prisma.InputJsonValue);

  const line = {
    ts: new Date().toISOString(),
    level,
    category: input.category,
    message: input.message,
    meta: input.meta ?? null,
  };

  if (level === 'ERROR') {
    console.error('[system-log]', JSON.stringify(line));
  } else if (level === 'WARN') {
    console.warn('[system-log]', JSON.stringify(line));
  } else {
    console.info('[system-log]', JSON.stringify(line));
  }

  await prisma.auditLog.create({
    data: {
      userId: null,
      action,
      meta: payload,
    },
  }).catch(() => undefined);
}
