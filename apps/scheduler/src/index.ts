import cron from 'node-cron';
import { Queue } from 'bullmq';
import pino from 'pino';
import { prisma } from '@nms/db';
import { DEVICE_SYNC_QUEUE, DEVICE_PING_QUEUE } from '@nms/shared';
import { z } from 'zod';

const env = z
  .object({
    REDIS_URL: z.string().default('redis://localhost:6379'),
    SYNC_CRON: z.string().default('*/30 * * * *'),
  })
  .parse(process.env);

const logger = pino({ name: '@nms/scheduler' });
const syncQueue = new Queue(DEVICE_SYNC_QUEUE, {
  connection: { url: env.REDIS_URL },
});
const pingQueue = new Queue(DEVICE_PING_QUEUE, {
  connection: { url: env.REDIS_URL },
});

// ── ICMP settings helpers ──────────────────────────────────

interface IcmpSettings {
  enabled: boolean;
  intervalSec: number;
  timeoutSec: number;
  retries: number;
}

const ICMP_DEFAULTS: IcmpSettings = {
  enabled: true,
  intervalSec: 120,
  timeoutSec: 3,
  retries: 1,
};

async function loadIcmpSettings(): Promise<IcmpSettings> {
  try {
    const config = await prisma.integrationConfig.findUnique({
      where: { provider: 'icmp' },
    });
    if (!config || !config.enabled) {
      return { ...ICMP_DEFAULTS, enabled: config?.enabled ?? ICMP_DEFAULTS.enabled };
    }
    const s = config.settings as Record<string, unknown>;
    return {
      enabled: config.enabled,
      intervalSec: typeof s['intervalSec'] === 'number' ? s['intervalSec'] : ICMP_DEFAULTS.intervalSec,
      timeoutSec: typeof s['timeoutSec'] === 'number' ? s['timeoutSec'] : ICMP_DEFAULTS.timeoutSec,
      retries: typeof s['retries'] === 'number' ? s['retries'] : ICMP_DEFAULTS.retries,
    };
  } catch {
    return ICMP_DEFAULTS;
  }
}

// ── Sync jobs ──────────────────────────────────────────────

async function enqueueSyncBatch() {
  const devices = await prisma.device.findMany({
    where: { zabbixHostId: { not: null } },
    select: { id: true },
  });

  await Promise.all(
    devices.map((device: { id: string }) =>
      syncQueue.add(
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

// ── Ping jobs ──────────────────────────────────────────────

async function enqueuePingBatch() {
  const icmp = await loadIcmpSettings();
  if (!icmp.enabled) {
    logger.info('ICMP monitoring disabled – skipping ping batch');
    return;
  }

  const devices = await prisma.device.findMany({
    select: { id: true, ip: true },
  });

  await Promise.all(
    devices.map((device: { id: string; ip: string }) =>
      pingQueue.add(
        'ping-device',
        { deviceId: device.id, ip: device.ip, timeoutSec: icmp.timeoutSec },
        {
          attempts: icmp.retries,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      ),
    ),
  );

  logger.info({ count: devices.length, timeoutSec: icmp.timeoutSec }, 'Scheduled ping jobs enqueued');
}

// ── Cron schedules ─────────────────────────────────────────

cron.schedule(env.SYNC_CRON, () => {
  enqueueSyncBatch().catch((error) => logger.error({ err: error }, 'Failed to enqueue sync batch'));
});

// ICMP ping: runs every minute, but the enqueuePingBatch() itself checks
// the enabled flag and interval stored in DB.
let lastPingRun = 0;

cron.schedule('* * * * *', () => {
  (async () => {
    const icmp = await loadIcmpSettings();
    const now = Date.now();
    if (now - lastPingRun < icmp.intervalSec * 1000) return;
    lastPingRun = now;
    await enqueuePingBatch();
  })().catch((error) => logger.error({ err: error }, 'Failed to enqueue ping batch'));
});

enqueueSyncBatch().catch((error) => logger.error({ err: error }, 'Initial sync enqueue failed'));
enqueuePingBatch().then(() => { lastPingRun = Date.now(); }).catch((error) => logger.error({ err: error }, 'Initial ping enqueue failed'));
logger.info({ syncCron: env.SYNC_CRON }, 'Scheduler started');
