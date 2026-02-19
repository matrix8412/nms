import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { ApiError } from '@/lib/errors';
import { verifyEmail } from '@/services/auth-service';
import { getClientIp, getUserAgent } from '@/lib/request-meta';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const email = request.nextUrl.searchParams.get('email');
    const token = request.nextUrl.searchParams.get('token');
    if (!email || !token) {
      throw new ApiError(400, 'BAD_REQUEST', 'Missing email or token');
    }

    await verifyEmail({
      email,
      token,
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return ok({ ok: true });
  });
}
