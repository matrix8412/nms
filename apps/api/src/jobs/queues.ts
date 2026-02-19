import { Queue } from 'bullmq';
import { DEVICE_COMMANDS_QUEUE, DEVICE_SYNC_QUEUE } from '@nms/shared';
import { env } from '@/lib/env';

const connection = {
  url: env.REDIS_URL,
};

export const deviceSyncQueue = new Queue(DEVICE_SYNC_QUEUE, { connection });
export const deviceCommandsQueue = new Queue(DEVICE_COMMANDS_QUEUE, { connection });
