import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { listUsers } from '@/services/admin-service';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const users = await listUsers();
    return ok({ data: users });
  });
}
