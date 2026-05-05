import { prisma } from '@nms/db';
import { ApiError } from '@/lib/errors';
import { writeSystemLog } from '@/lib/system-log';

function toApiUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/api_jsonrpc.php') ? trimmed : `${trimmed.replace(/\/+$/, '')}/api_jsonrpc.php`;
}

async function zabbixCall<T>(url: string, token: string, method: string, params: unknown): Promise<T> {
  const traceId = `zbx-int-${Date.now()}-${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    await writeSystemLog({
      category: 'ZABBIX_API',
      level: 'ERROR',
      message: `Zabbix HTTP ${response.status}`,
      meta: { traceId, method, url, status: response.status },
    });
    throw new ApiError(400, 'BAD_REQUEST', `Zabbix HTTP ${response.status} (traceId: ${traceId})`);
  }

  const body = (await response.json()) as {
    result?: T;
    error?: { code: number; message: string; data?: string };
  };
  if (body.error) {
    await writeSystemLog({
      category: 'ZABBIX_API',
      level: 'ERROR',
      message: `Zabbix error ${body.error.code}: ${body.error.message}`,
      meta: { traceId, method, url, code: body.error.code, error: body.error.message, data: body.error.data ?? null },
    });
    throw new ApiError(400, 'BAD_REQUEST', `Zabbix error ${body.error.code}: ${body.error.message} (traceId: ${traceId})`);
  }

  return body.result as T;
}

export async function getZabbixIntegrationConnection() {
  const config = await prisma.integrationConfig.findUnique({ where: { provider: 'zabbix' } });
  const settings = (config?.settings as Record<string, unknown> | null) ?? null;
  const url = toApiUrl(String(settings?.['url'] ?? ''));
  const token = String(settings?.['apiToken'] ?? '').trim();

  if (!url) {
    throw new ApiError(400, 'BAD_REQUEST', 'Missing Zabbix API URL in integration settings');
  }
  if (!token) {
    throw new ApiError(400, 'BAD_REQUEST', 'Missing Zabbix API token in integration settings');
  }

  return { url, token };
}

export async function getZabbixTemplatesFromIntegration() {
  const { url, token } = await getZabbixIntegrationConnection();
  return zabbixCall<Array<{ templateid: string; host: string; name: string }>>(url, token, 'template.get', {
    output: ['templateid', 'host', 'name'],
    sortfield: 'host',
    sortorder: 'ASC',
  });
}

export async function getZabbixTemplateItemsFromIntegration(templateId: string) {
  const { url, token } = await getZabbixIntegrationConnection();
  return zabbixCall<Array<{ itemid: string; key_: string; name: string }>>(url, token, 'item.get', {
    templateids: [templateId],
    output: ['itemid', 'key_', 'name'],
    sortfield: 'key_',
    sortorder: 'ASC',
  });
}
