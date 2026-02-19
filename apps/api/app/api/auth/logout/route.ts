import { NextResponse, type NextRequest } from 'next/server';
import { assertCsrf } from '@/lib/auth/csrf';
import { clearSession, requireAuth } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp, getUserAgent } from '@/lib/request-meta';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth(request);
    assertCsrf(request, session.csrfSecret);
    const response = NextResponse.json({ ok: true });
    await clearSession(request, response);
    await writeAuditLog({
      userId: session.user.id,
      action: 'logout',
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return response;
  });
}
