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

const createSchema = z.object({
  vendor: z.string().trim().max(120).optional().nullable(),
  deviceType: z.string().trim().max(120).optional().nullable(),
  metricKey: metricKeySchema,
  oid: z.string().trim().min(3).max(255),
  category: z.enum(['OVERVIEW', 'INTERFACES']).default('OVERVIEW'),
  intervalSec: z.coerce.number().int().min(30).max(86400).default(1800),
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
        category: payload.category,
        intervalSec: payload.intervalSec,
        enabled: payload.enabled,
      },
    });
    return ok({ data: template }, { status: 201 });
  });
}
