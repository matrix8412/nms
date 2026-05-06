import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const metricKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, 'Metric key must start with a letter and contain only letters, numbers, dot, underscore, or dash');

const updateSchema = z.object({
  vendor: z.string().trim().max(120).optional().nullable(),
  deviceType: z.string().trim().max(120).optional().nullable(),
  metricKey: metricKeySchema,
  oid: z.string().trim().min(3).max(255),
  category: z.enum(['OVERVIEW', 'INTERFACES']).default('OVERVIEW'),
  intervalSec: z.coerce.number().int().min(30).max(86400).default(1800),
  enabled: z.boolean().default(true),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, updateSchema);
    const template = await prisma.snmpOidTemplate.update({
      where: { id },
      data: {
        vendor: payload.vendor || null,
        deviceType: payload.deviceType || null,
        metricKey: payload.metricKey,
        oid: payload.oid,
        category: payload.category,
        intervalSec: payload.intervalSec,
        enabled: payload.enabled,
      },
    });
    return ok({ data: template });
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    await prisma.snmpOidTemplate.delete({ where: { id } });
    return ok({ ok: true });
  });
}
