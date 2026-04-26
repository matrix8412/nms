import { exec } from 'node:child_process';
import { prisma } from '@nms/db';
import type { Prisma } from '@nms/db';
import pino from 'pino';

const logger = pino({ name: '@nms/worker:ping' });

/**
 * Ping a single IP address using the system `ping` command.
 * Returns round-trip time in ms on success, or null on failure.
 */
export function pingHost(ip: string, timeoutSec = 3): Promise<number | null> {
  return new Promise((resolve) => {
    // Linux: -c 1 (count), -W <timeout> (seconds)
    // Windows: -n 1 (count), -w <timeout> (milliseconds)
    const isWin = process.platform === 'win32';
    const cmd = isWin
      ? `ping -n 1 -w ${timeoutSec * 1000} ${ip}`
      : `ping -c 1 -W ${timeoutSec} ${ip}`;

    exec(cmd, { timeout: (timeoutSec + 2) * 1000 }, (error, stdout, stderr) => {
      if (error) {
        logger.debug({ ip, code: (error as NodeJS.ErrnoException).code, stderr }, 'ping failed');
        resolve(null);
        return;
      }

      // Parse round-trip time from output
      // Linux:  "time=1.23 ms"
      // Windows: "time=1ms" or "time<1ms"
      const match = stdout.match(/time[=<]([\d.]+)\s*ms/i);
      if (match?.[1]) {
        resolve(parseFloat(match[1]));
      } else {
        // Got a response but couldn't parse time – treat as UP with 0 ms
        resolve(0);
      }
    });
  });
}

/**
 * Ping a device with retries, then update its ICMP status in the database.
 */
export async function pingDevice(
  deviceId: string,
  ip: string,
  timeoutSec = 3,
  retries = 2,
  historyRetentionDays = 30,
) {
  const totalAttempts = Math.max(retries, 1);
  let rtt: number | null = null;
  let completedAttempts = 0;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    completedAttempts = attempt;
    rtt = await pingHost(ip, timeoutSec);
    if (rtt !== null) break;
    if (attempt < totalAttempts) {
      logger.debug({ ip, attempt, totalAttempts }, 'ping retry');
    }
  }

  const isUp = rtt !== null;
  const recordedAt = new Date();
  const lossAttempts = isUp ? Math.max(completedAttempts - 1, 0) : completedAttempts;
  const packetLossPercent = completedAttempts > 0
    ? Math.round((lossAttempts / completedAttempts) * 1000) / 10
    : 100;
  const metrics: Prisma.DeviceMetricCreateManyInput[] = [
    {
      deviceId,
      source: 'icmp',
      itemKey: 'icmp.status',
      itemName: 'ICMP Status',
      valueNumeric: isUp ? 1 : 0,
      valueText: isUp ? 'UP' : 'DOWN',
      recordedAt,
      metadata: { ip, timeoutSec, retries },
    },
    {
      deviceId,
      source: 'icmp',
      itemKey: 'icmp.packetLoss',
      itemName: 'ICMP Packet Loss',
      valueNumeric: packetLossPercent,
      valueText: `${packetLossPercent}`,
      recordedAt,
      metadata: { ip, completedAttempts, totalAttempts, unit: '%' },
    },
  ];

  if (rtt !== null) {
    metrics.push({
      deviceId,
      source: 'icmp',
      itemKey: 'icmp.rtt',
      itemName: 'ICMP Round Trip Time',
      valueNumeric: rtt,
      valueText: `${rtt}`,
      recordedAt,
      metadata: { ip, unit: 'ms' },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.device.update({
      where: { id: deviceId },
      data: {
        icmpStatus: isUp ? 'UP' : 'DOWN',
        lastPingAt: recordedAt,
        lastPingDuration: rtt,
      },
    });

    await tx.deviceMetric.createMany({
      data: metrics,
    });

    if (historyRetentionDays > 0) {
      const retentionCutoff = new Date(recordedAt.getTime() - historyRetentionDays * 24 * 60 * 60 * 1000);
      await tx.deviceMetric.deleteMany({
        where: {
          source: 'icmp',
          recordedAt: { lt: retentionCutoff },
        },
      });
    }
  });

  logger.info({ deviceId, ip, isUp, rtt, packetLossPercent, completedAttempts, totalAttempts }, 'device ping result');
}
