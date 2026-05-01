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

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } });
    const csv = toCsv(
      ['id', 'name', 'logoDataUrl'],
      vendors.map((item) => [item.id, item.name, item.logoDataUrl ?? '']),
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
      await prisma.vendor.upsert({
        where: row.id ? { id: row.id } : { name },
        update: { name, logoDataUrl: (row.logoDataUrl ?? '').trim() || null },
        create: { name, logoDataUrl: (row.logoDataUrl ?? '').trim() || null },
      });
    }
    return NextResponse.json({ ok: true });
  });
}
