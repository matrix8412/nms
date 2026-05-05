import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { assertCsrf } from '@/lib/auth/csrf';
import { ApiError } from '@/lib/errors';
import { writeSystemLog } from '@/lib/system-log';
import type { NextRequest } from 'next/server';

function toApiUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/api_jsonrpc.php') ? trimmed : `${trimmed.replace(/\/+$/, '')}/api_jsonrpc.php`;
}

async function zabbixCall(url: string, method: string, params: unknown, apiToken?: string) {
  const traceId = `zbx-test-${Date.now()}-${method}`;
  const token = apiToken?.trim() || '';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      category: 'ZABBIX_TEST',
      level: 'ERROR',
      message: `Zabbix HTTP ${response.status}`,
      meta: { traceId, method, url, status: response.status },
    });
    throw new ApiError(400, 'BAD_REQUEST', `Zabbix HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    result?: unknown;
    error?: { code: number; message: string };
  };
  if (body.error) {
    await writeSystemLog({
      category: 'ZABBIX_TEST',
      level: 'ERROR',
      message: `Zabbix error ${body.error.code}: ${body.error.message}`,
      meta: { traceId, method, url, code: body.error.code, error: body.error.message },
    });
    throw new ApiError(400, 'BAD_REQUEST', `Zabbix error ${body.error.code}: ${body.error.message}`);
  }

  return body.result;
}

type Params = { params: Promise<{ provider: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { provider } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);

    if (provider !== 'zabbix') {
      throw new ApiError(400, 'BAD_REQUEST', `Connection test is not supported for provider "${provider}"`);
    }

    const config = await prisma.integrationConfig.findUnique({ where: { provider: 'zabbix' } });
    const settings = (config?.settings as Record<string, unknown> | null) ?? null;
    const url = toApiUrl(String(settings?.['url'] ?? ''));
    const apiToken = String(settings?.['apiToken'] ?? '').trim();

    if (!url) {
      throw new ApiError(400, 'BAD_REQUEST', 'Missing Zabbix API URL in integration settings');
    }

    const version = await zabbixCall(url, 'apiinfo.version', {});
    if (apiToken) {
      await zabbixCall(url, 'host.get', { output: ['hostid'], limit: 1 }, apiToken);
    }

    return ok({
      ok: true,
      provider: 'zabbix',
      version: String(version ?? ''),
      tokenValidated: !!apiToken,
    });
  });
}
