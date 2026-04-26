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

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  vendor: z.string().trim().max(120).optional().nullable(),
  photoDataUrl: imageDataUrlSchema,
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const { name, vendor, photoDataUrl } = await parseBody(request, updateSchema);
    const dt = await prisma.deviceType.update({
      where: { id },
      data: {
        name,
        vendor: vendor || null,
        photoDataUrl: photoDataUrl || null,
      },
    });
    return ok({ data: dt });
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    await prisma.deviceType.delete({ where: { id } });
    return ok({ ok: true });
  });
}
