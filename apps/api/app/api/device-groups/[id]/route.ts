import { deviceGroupUpdateSchema } from '@nms/shared';
import { requireAdmin, requireAuth } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import {
  deleteDeviceGroup,
  getDeviceGroupById,
  updateDeviceGroup,
} from '@/services/device-group-service';
import type { NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAuth(request);
    const group = await getDeviceGroupById(id, session);
    return ok({ data: group });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, deviceGroupUpdateSchema);
    const group = await updateDeviceGroup(id, payload);
    return ok({ data: group });
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const result = await deleteDeviceGroup(id);
    return ok(result);
  });
}
