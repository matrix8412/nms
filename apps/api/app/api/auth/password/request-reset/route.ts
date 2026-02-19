import { passwordResetRequestSchema } from '@nms/shared';
import { assertCsrf } from '@/lib/auth/csrf';
import { assertRateLimit } from '@/lib/auth/rate-limit';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { getClientIp, getUserAgent } from '@/lib/request-meta';
import { requestPasswordReset } from '@/services/auth-service';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const ip = getClientIp(request) ?? 'unknown';
    await assertRateLimit({ bucket: `auth:reset-request:${ip}`, limit: 10, windowSec: 900 });
    assertCsrf(request);
    const payload = await parseBody(request, passwordResetRequestSchema);
    await requestPasswordReset({
      email: payload.email,
      ip,
      userAgent: getUserAgent(request),
    });
    return ok({
      ok: true,
      message: 'If the account exists, a reset email has been sent.',
    });
  });
}
