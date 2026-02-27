import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const createSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } });
    return ok({ data: vendors });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const { name } = await parseBody(request, createSchema);
    const vendor = await prisma.vendor.create({ data: { name } });
    return ok({ data: vendor }, { status: 201 });
  });
}
