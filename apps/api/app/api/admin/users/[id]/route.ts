import { userUpdateSchema } from '@nms/shared';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { updateUserAdmin } from '@/services/admin-service';
import type { NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, userUpdateSchema);
    const { id } = await params;
    const user = await updateUserAdmin(id, payload);
    return ok({ data: user });
  });
}
