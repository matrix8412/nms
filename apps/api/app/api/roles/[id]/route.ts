import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { ApiError } from '@/lib/errors';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  permissions: z
    .array(z.object({ resource: z.string(), action: z.string() }))
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const body = await parseBody(request, updateSchema);

    const role = await prisma.$transaction(async (tx) => {
      const existing = await tx.role.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Role not found');

      await tx.role.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
        },
      });

      if (body.permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (body.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: body.permissions.map((p) => ({
              roleId: id,
              resource: p.resource,
              action: p.action,
            })),
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: { permissions: true },
      });
    });

    return ok({ data: role });
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new ApiError(404, 'NOT_FOUND', 'Role not found');
    if (role.builtIn) throw new ApiError(400, 'BAD_REQUEST', 'Cannot delete a built-in role');

    await prisma.role.delete({ where: { id } });
    return ok({ ok: true });
  });
}
