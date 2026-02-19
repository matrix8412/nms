import { groupCreateSchema } from '@nms/shared';
import { requireAdmin, requireAuth } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { createGroup, listGroups } from '@/services/group-service';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth(request);
    const groups = await listGroups(session);
    return ok({ data: groups });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, groupCreateSchema);
    const group = await createGroup(payload.name);
    return ok({ data: group }, { status: 201 });
  });
}
