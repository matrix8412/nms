import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { assertCsrf } from '@/lib/auth/csrf';
import { ApiError } from '@/lib/errors';
import type { NextRequest } from 'next/server';

type Params = { params: Promise<{ provider: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { provider } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);

    throw new ApiError(400, 'BAD_REQUEST', `Connection test is not supported for provider "${provider}"`);
  });
}
