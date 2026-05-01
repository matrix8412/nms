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
    const groups = await prisma.deviceGroup.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { devices: true } } },
    });
    const csv = toCsv(
      ['id', 'name', 'description', 'hostsCount'],
      groups.map((item) => [item.id, item.name, item.description ?? '', item._count.devices]),
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
      const data = { name, description: (row.description ?? '').trim() || null };
      const rowId = (row.id ?? '').trim();
      await prisma.deviceGroup.upsert({
        where: rowId ? { id: rowId } : { name },
        update: data,
        create: data,
      });
    }
    return NextResponse.json({ ok: true });
  });
}
