import { prisma } from '@nms/db';
import { zabbixSyncRequestSchema } from '@nms/shared';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { getDeviceSyncQueue } from '@/jobs/queues';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, zabbixSyncRequestSchema);

    const devices = await prisma.device.findMany({
      where: {
        OR: [
          { zabbixHostId: { not: null } },
          { snmpVersion: { not: null } },
        ],
        ...(payload.deviceIds?.length
          ? {
              id: { in: payload.deviceIds },
            }
          : {}),
      },
      select: { id: true },
    });

    const deviceSyncQueue = getDeviceSyncQueue();
    await Promise.all(
      devices.map((device) =>
        deviceSyncQueue.add(
          'sync-device',
          { deviceId: device.id, force: payload.force },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          },
        ),
      ),
    );

    return ok({ ok: true, enqueued: devices.length });
  });
}
