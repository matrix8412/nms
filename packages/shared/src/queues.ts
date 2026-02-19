export const DEVICE_SYNC_QUEUE = 'device-sync';
export const DEVICE_COMMANDS_QUEUE = 'device-commands';

export type DeviceSyncJobPayload = {
  deviceId: string;
  force?: boolean;
};
