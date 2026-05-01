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

function toNumber(value: string, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const sites = await prisma.site.findMany({ orderBy: { name: 'asc' } });
    const csv = toCsv(
      ['id', 'name', 'street', 'descriptiveNumber', 'orientationNumber', 'zipNumber', 'city', 'latitude', 'longitude', 'description'],
      sites.map((item) => [
        item.id,
        item.name,
        item.street,
        item.descriptiveNumber,
        item.orientationNumber ?? '',
        item.zipNumber,
        item.city,
        item.latitude,
        item.longitude,
        item.description ?? '',
      ]),
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
      const name = (row.name ?? '').trim();
      if (!name) continue;
      const createData = {
        name,
        street: (row.street ?? '').trim(),
        descriptiveNumber: (row.descriptiveNumber ?? '').trim(),
        orientationNumber: (row.orientationNumber ?? '').trim() || null,
        zipNumber: (row.zipNumber ?? '').trim(),
        city: (row.city ?? '').trim(),
        latitude: toNumber(row.latitude ?? '', 48.1485965),
        longitude: toNumber(row.longitude ?? '', 17.1077477),
        description: (row.description ?? '').trim() || null,
      };
      if (!createData.street || !createData.descriptiveNumber || !createData.zipNumber || !createData.city) {
        continue;
      }
      await prisma.site.upsert({
        where: row.id ? { id: row.id } : { name },
        update: createData,
        create: createData,
      });
    }
    return NextResponse.json({ ok: true });
  });
}
