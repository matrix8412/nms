import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { requireAuth } from '@/lib/auth/session';
import { toAuthUserDto } from '@/lib/auth/user-dto';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth(request);
    return ok({
      authenticated: true,
      user: toAuthUserDto(session),
      csrfToken: session.csrfSecret,
    });
  });
}
