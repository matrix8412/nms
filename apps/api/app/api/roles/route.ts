import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional().nullable(),
  permissions: z
    .array(z.object({ resource: z.string(), action: z.string() }))
    .default([]),
});

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const roles = await prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
    return ok({ data: roles });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const body = await parseBody(request, createSchema);
    const role = await prisma.role.create({
      data: {
        name: body.name,
        description: body.description,
        permissions: {
          create: body.permissions.map((p) => ({
            resource: p.resource,
            action: p.action,
          })),
        },
      },
      include: { permissions: true },
    });
    return ok({ data: role }, { status: 201 });
  });
}
