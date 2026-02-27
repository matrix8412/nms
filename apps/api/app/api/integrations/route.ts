import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const configs = await prisma.integrationConfig.findMany({ orderBy: { provider: 'asc' } });
    return ok({ data: configs });
  });
}
