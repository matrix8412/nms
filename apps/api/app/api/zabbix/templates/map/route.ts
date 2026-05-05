import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { getZabbixTemplateItemsFromIntegration } from '@/lib/zabbix/integration-api';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const mapTemplateSchema = z.object({
  templateId: z.string().trim().min(1),
  vendor: z.string().trim().max(120).optional().nullable(),
  deviceType: z.string().trim().max(120).optional().nullable(),
  replace: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const payload = await parseBody(request, mapTemplateSchema);

    const templateItems = await getZabbixTemplateItemsFromIntegration(payload.templateId);
    const uniqueItems = [...new Map(templateItems
      .filter((item) => item.key_?.trim())
      .map((item) => [item.key_.trim(), item])).values()];

    const vendor = payload.vendor?.trim() || null;
    const deviceType = payload.deviceType?.trim() || null;

    const created = await prisma.$transaction(async (tx) => {
      if (payload.replace) {
        await tx.zabbixItemMapping.deleteMany({
          where: {
            vendor,
            deviceType,
          },
        });
      }

      if (uniqueItems.length === 0) {
        return 0;
      }

      const result = await tx.zabbixItemMapping.createMany({
        data: uniqueItems.map((item) => ({
          vendor,
          deviceType,
          itemKey: item.key_.trim(),
          itemName: item.name?.trim() || null,
          enabled: true,
        })),
        skipDuplicates: true,
      });
      return result.count;
    });

    return ok({
      ok: true,
      imported: created,
      totalItems: uniqueItems.length,
    });
  });
}
