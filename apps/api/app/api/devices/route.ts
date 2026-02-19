import { deviceCreateSchema } from '@nms/shared';
import { requireAdmin, requireAuth } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { createDevice, listDevices } from '@/services/device-service';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth(request);
    const search = request.nextUrl.searchParams.get('q');
    const devices = await listDevices(session, search);
    return ok({ data: devices });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, deviceCreateSchema);
    const device = await createDevice(payload);
    return ok({ data: device }, { status: 201 });
  });
}
