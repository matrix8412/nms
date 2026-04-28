import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const imageDataUrlSchema = z
  .string()
  .trim()
  .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=\r\n]+$/, 'Invalid image format')
  .max(3_000_000, 'Image is too large')
  .optional()
  .nullable();

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logoDataUrl: imageDataUrlSchema,
});

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
    const { name, logoDataUrl } = await parseBody(request, createSchema);
    const vendor = await prisma.vendor.create({
      data: {
        name,
        logoDataUrl: logoDataUrl || null,
      },
    });
    return ok({ data: vendor }, { status: 201 });
  });
}
