import { Worker } from 'bullmq';
import pino from 'pino';
import { DEVICE_COMMANDS_QUEUE, DEVICE_SYNC_QUEUE, DEVICE_PING_QUEUE, type DeviceSyncJobPayload, type DevicePingJobPayload } from '@nms/shared';
import { env } from './env.js';
import { syncDevice } from './sync.js';
import { pingDevice } from './ping.js';

const logger = pino({ name: '@nms/worker' });

const connection = { url: env.REDIS_URL };

logger.info({ redisUrl: env.REDIS_URL }, 'Connecting to Redis');

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

const pingWorker = new Worker<DevicePingJobPayload>(
  DEVICE_PING_QUEUE,
  async (job) => {
    await pingDevice(job.data.deviceId, job.data.ip, job.data.timeoutSec, job.data.retries);
  },
  {
    connection,
    concurrency: 10,
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

// Verify Redis connectivity
pingWorker.waitUntilReady().then(() => {
  logger.info('Redis connection established (ping worker ready)');
}).catch((err) => {
  logger.error({ err }, 'Redis connection FAILED — worker cannot process jobs');
});

syncWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'device sync completed'));
syncWorker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, error: error.message }, 'device sync failed'),
);
pingWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'device ping completed'));
pingWorker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, error: error.message }, 'device ping failed'),
);
commandWorker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, error: error.message }, 'device command failed'),
);

process.on('SIGINT', async () => {
  await Promise.all([syncWorker.close(), pingWorker.close(), commandWorker.close()]);
  process.exit(0);
});

logger.info('Worker started');
