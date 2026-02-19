import { prisma } from '@nms/db';
import { loginSchema } from '@nms/shared';
import { assertCsrf } from '@/lib/auth/csrf';
import { assertRateLimit } from '@/lib/auth/rate-limit';
import { createSession, setSessionCookies } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { parseBody } from '@/lib/validation';
import { getClientIp, getUserAgent } from '@/lib/request-meta';
import { loginUser } from '@/services/auth-service';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const ip = getClientIp(request) ?? 'unknown';
    await assertRateLimit({ bucket: `auth:login:${ip}`, limit: 12, windowSec: 300 });
    assertCsrf(request);

    const payload = await parseBody(request, loginSchema);
    const loginResult = await loginUser({
      email: payload.email,
      password: payload.password,
      ip,
      userAgent: getUserAgent(request),
    });

    const createdSession = await createSession(loginResult.userId);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: loginResult.userId },
      include: {
        groupMemberships: {
          include: {
            group: true,
          },
        },
      },
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        groups: user.groupMemberships.map((membership) => ({
          id: membership.group.id,
          name: membership.group.name,
          roleInGroup: membership.roleInGroup,
        })),
      },
      csrfToken: createdSession.csrfSecret,
    });
    setSessionCookies(response, createdSession);
    return response;
  });
}
