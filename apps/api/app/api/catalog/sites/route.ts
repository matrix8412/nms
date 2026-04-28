import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const siteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  street: z.string().trim().min(1).max(120),
  descriptiveNumber: z.string().trim().min(1).max(40),
  orientationNumber: z.string().trim().max(40).optional().nullable(),
  zipNumber: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  description: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const sites = await prisma.site.findMany({ orderBy: [{ name: 'asc' }] });
    return ok({ data: sites });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, siteSchema);
    const site = await prisma.site.create({
      data: {
        ...payload,
        orientationNumber: payload.orientationNumber || null,
        description: payload.description || null,
      },
    });
    return ok({ data: site }, { status: 201 });
  });
}
