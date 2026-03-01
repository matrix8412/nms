export const DEVICE_SYNC_QUEUE = 'device-sync';
export const DEVICE_COMMANDS_QUEUE = 'device-commands';
export const DEVICE_PING_QUEUE = 'device-ping';

export type DeviceSyncJobPayload = {
  deviceId: string;
  force?: boolean;
};

export type DevicePingJobPayload = {
  deviceId: string;
  ip: string;
  timeoutSec?: number;
};
