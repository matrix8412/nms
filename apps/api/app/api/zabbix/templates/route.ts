import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { getZabbixTemplatesFromIntegration } from '@/lib/zabbix/integration-api';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin(request);
    const templates = await getZabbixTemplatesFromIntegration();
    return ok({
      data: templates.map((item) => ({
        id: item.templateid,
        host: item.host,
        name: item.name,
      })),
    });
  });
}
