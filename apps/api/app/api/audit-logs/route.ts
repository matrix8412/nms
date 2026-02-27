import { prisma } from '@nms/db';
import { requireAuth } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth(request);

    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 25));
    const skip = (page - 1) * limit;

    const isAdmin = session.user.role === 'ADMIN';

    const where = isAdmin ? {} : { userId: session.user.id };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = logs.map((log: typeof logs[number]) => ({
      id: log.id,
      action: log.action,
      userEmail: log.user?.email ?? null,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      meta: log.meta,
    }));

    return ok({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  });
}
