import cron from 'node-cron';
import { Queue } from 'bullmq';
import pino from 'pino';
import { prisma } from '@nms/db';
import { DEVICE_SYNC_QUEUE } from '@nms/shared';
import { z } from 'zod';

const env = z
  .object({
    REDIS_URL: z.string().default('redis://localhost:6379'),
    SYNC_CRON: z.string().default('*/30 * * * *'),
  })
  .parse(process.env);

const logger = pino({ name: '@nms/scheduler' });
const queue = new Queue(DEVICE_SYNC_QUEUE, {
  connection: { url: env.REDIS_URL },
});

async function enqueueSyncBatch() {
  const devices = await prisma.device.findMany({
    where: { zabbixHostId: { not: null } },
    select: { id: true },
  });

  await Promise.all(
    devices.map((device: { id: string }) =>
      queue.add(
        'sync-device',
        { deviceId: device.id },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      ),
    ),
  );

  logger.info({ count: devices.length }, 'Scheduled sync jobs enqueued');
}

cron.schedule(env.SYNC_CRON, () => {
  enqueueSyncBatch().catch((error) => logger.error({ err: error }, 'Failed to enqueue sync batch'));
});

enqueueSyncBatch().catch((error) => logger.error({ err: error }, 'Initial enqueue failed'));
logger.info({ cron: env.SYNC_CRON }, 'Scheduler started');
