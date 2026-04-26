import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const metricKeySchema = z.enum([
  'hostname',
  'softwareVersion',
  'uptime',
  'ifOperStatus',
  'ifName',
  'ifDescription',
  'ifMac',
]);

const updateSchema = z.object({
  vendor: z.string().trim().max(120).optional().nullable(),
  deviceType: z.string().trim().max(120).optional().nullable(),
  metricKey: metricKeySchema,
  oid: z.string().trim().min(3).max(255),
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