import { Queue } from 'bullmq';
import { DEVICE_COMMANDS_QUEUE, DEVICE_SYNC_QUEUE } from '@nms/shared';
import { env } from '@/lib/env';

let deviceSyncQueue: Queue | null = null;
let deviceCommandsQueue: Queue | null = null;

export function getDeviceSyncQueue() {
  if (!deviceSyncQueue) {
    deviceSyncQueue = new Queue(DEVICE_SYNC_QUEUE, {
      connection: { url: env.REDIS_URL },
    });
  }
  return deviceSyncQueue;
}

export function getDeviceCommandsQueue() {
  if (!deviceCommandsQueue) {
    deviceCommandsQueue = new Queue(DEVICE_COMMANDS_QUEUE, {
      connection: { url: env.REDIS_URL },
    });
  }
  return deviceCommandsQueue;
}
