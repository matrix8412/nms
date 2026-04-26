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

const createSchema = z.object({
  vendor: z.string().trim().max(120).optional().nullable(),
  deviceType: z.string().trim().max(120).optional().nullable(),
  metricKey: metricKeySchema,
  oid: z.string().trim().min(3).max(255),
  enabled: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const templates = await prisma.snmpOidTemplate.findMany({
      orderBy: [{ vendor: 'asc' }, { deviceType: 'asc' }, { metricKey: 'asc' }],
    });
    return ok({ data: templates });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, createSchema);
    const template = await prisma.snmpOidTemplate.create({
      data: {
        vendor: payload.vendor || null,
        deviceType: payload.deviceType || null,
        metricKey: payload.metricKey,
        oid: payload.oid,
        enabled: payload.enabled,
      },
    });
    return ok({ data: template }, { status: 201 });
  });
}