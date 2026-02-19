import { registerSchema } from '@nms/shared';
import { assertCsrf } from '@/lib/auth/csrf';
import { assertRateLimit } from '@/lib/auth/rate-limit';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { getClientIp, getUserAgent } from '@/lib/request-meta';
import { registerUser } from '@/services/auth-service';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const ip = getClientIp(request) ?? 'unknown';
    await assertRateLimit({ bucket: `auth:register:${ip}`, limit: 10, windowSec: 300 });
    assertCsrf(request);
    const payload = await parseBody(request, registerSchema);
    await registerUser({
      email: payload.email,
      password: payload.password,
      ip,
      userAgent: getUserAgent(request),
    });
    return ok({
      ok: true,
      message: 'Registration successful. Please check your email for verification link.',
    });
  });
}
