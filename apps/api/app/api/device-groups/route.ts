import { deviceGroupCreateSchema } from '@nms/shared';
import { requireAdmin, requireAuth } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { createDeviceGroup, listDeviceGroups } from '@/services/device-group-service';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth(request);
    const groups = await listDeviceGroups(session);
    return ok({ data: groups });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, deviceGroupCreateSchema);
    const group = await createDeviceGroup(payload);
    return ok({ data: group }, { status: 201 });
  });
}
