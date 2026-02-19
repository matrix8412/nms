import { groupUpdateSchema } from '@nms/shared';
import { requireAdmin, requireAuth } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { deleteGroup, getGroupById, updateGroup } from '@/services/group-service';
import type { NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAuth(request);
    const group = await getGroupById(id, session);
    return ok({ data: group });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, groupUpdateSchema);
    const group = await updateGroup(id, payload);
    return ok({ data: group });
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const result = await deleteGroup(id);
    return ok(result);
  });
}
