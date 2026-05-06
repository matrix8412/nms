import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { assertCsrf } from '@/lib/auth/csrf';
import { parseBody } from '@/lib/validation';
import { parseCsv, rowsToObjects, toCsv } from '@/lib/csv';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const importSchema = z.object({
  csv: z.string().min(1),
});

function toInterval(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1800;
  return Math.max(30, Math.min(86400, Math.round(numeric)));
}

function toEnabled(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function toCategory(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === 'INTERFACES' ? ('INTERFACES' as const) : ('OVERVIEW' as const);
}

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const templates = await prisma.snmpOidTemplate.findMany({
      orderBy: [{ vendor: 'asc' }, { deviceType: 'asc' }, { metricKey: 'asc' }],
    });
    const csv = toCsv(
      ['id', 'vendor', 'deviceType', 'metricKey', 'oid', 'category', 'intervalSec', 'enabled'],
      templates.map((item) => [item.id, item.vendor ?? '', item.deviceType ?? '', item.metricKey, item.oid, item.category, item.intervalSec, item.enabled]),
    );
    return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8' } });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const { csv } = await parseBody(request, importSchema);
    const rows = rowsToObjects(parseCsv(csv));
    for (const row of rows) {
      const metricKey = (row.metricKey ?? '').trim();
      const oid = (row.oid ?? '').trim();
      if (!metricKey || !oid) continue;
      const vendor = (row.vendor ?? '').trim() || null;
      const deviceType = (row.deviceType ?? '').trim() || null;
      const data = {
        vendor,
        deviceType,
        metricKey,
        oid,
        category: toCategory(row.category ?? ''),
        intervalSec: toInterval(row.intervalSec ?? ''),
        enabled: toEnabled(row.enabled ?? 'true'),
      };
      const rowId = (row.id ?? '').trim();
      if (rowId) {
        await prisma.snmpOidTemplate.upsert({
          where: { id: rowId },
          update: data,
          create: data,
        });
      } else {
        const existing = await prisma.snmpOidTemplate.findFirst({
          where: { vendor, deviceType, metricKey },
          select: { id: true },
        });
        if (existing) {
          await prisma.snmpOidTemplate.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await prisma.snmpOidTemplate.create({ data });
        }
      }
    }
    return NextResponse.json({ ok: true });
  });
}
