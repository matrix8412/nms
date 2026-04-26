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
  vendor: z.string().trim().max(120).optional().nullable(),
  photoDataUrl: imageDataUrlSchema,
});

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const types = await prisma.deviceType.findMany({ orderBy: [{ vendor: 'asc' }, { name: 'asc' }] });
    return ok({ data: types });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const { name, vendor, photoDataUrl } = await parseBody(request, createSchema);
    const dt = await prisma.deviceType.create({
      data: {
        name,
        vendor: vendor || null,
        photoDataUrl: photoDataUrl || null,
      },
    });
    return ok({ data: dt }, { status: 201 });
  });
}
