import { exec } from 'node:child_process';
import { prisma } from '@nms/db';
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
  retries = 1,
) {
  let rtt: number | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    rtt = await pingHost(ip, timeoutSec);
    if (rtt !== null) break;
    if (attempt < retries) {
      logger.debug({ ip, attempt, retries }, 'ping retry');
    }
  }

  const isUp = rtt !== null;

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      icmpStatus: isUp ? 'UP' : 'DOWN',
      lastPingAt: new Date(),
      lastPingDuration: rtt,
    },
  });

  logger.debug({ deviceId, ip, isUp, rtt }, 'device ping result');
}
