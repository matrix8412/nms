import { Worker } from 'bullmq';
import pino from 'pino';
import { DEVICE_COMMANDS_QUEUE, DEVICE_SYNC_QUEUE, type DeviceSyncJobPayload } from '@nms/shared';
import { env } from './env';
import { syncDevice } from './sync';

const logger = pino({ name: '@nms/worker' });

const connection = { url: env.REDIS_URL };

const syncWorker = new Worker<DeviceSyncJobPayload>(
  DEVICE_SYNC_QUEUE,
  async (job) => {
    await syncDevice(job.data.deviceId);
  },
  {
    connection,
    concurrency: 5,
  },
);

const commandWorker = new Worker(
  DEVICE_COMMANDS_QUEUE,
  async () => {
    // Placeholder queue for future command execution workflow.
  },
  {
    connection,
    concurrency: 2,
  },
);

syncWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'device sync completed'));
syncWorker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, error: error.message }, 'device sync failed'),
);
commandWorker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, error: error.message }, 'device command failed'),
);

process.on('SIGINT', async () => {
  await Promise.all([syncWorker.close(), commandWorker.close()]);
  process.exit(0);
});

logger.info('Worker started');
