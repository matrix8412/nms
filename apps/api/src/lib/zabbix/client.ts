import { env } from '@/lib/env';
import { writeSystemLog } from '@/lib/system-log';

type ZabbixResponse<T> = {
  jsonrpc: '2.0';
  result?: T;
  error?: { code: number; message: string; data?: string };
};

export class ZabbixClient {
  private authToken: string | null = null;
  private idCounter = 1;

  constructor(
    private readonly baseUrl: string,
    private readonly user: string,
    private readonly password: string,
  ) {}

  private async request<T>(method: string, params: unknown, auth?: string | null): Promise<T> {
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
      auth,
      id: this.idCounter++,
    };
    const traceId = `zbx-${Date.now()}-${payload.id}`;
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (!response.ok) {
        await writeSystemLog({
          category: 'ZABBIX_API',
          level: 'ERROR',
          message: `Zabbix HTTP error ${response.status}`,
          meta: { traceId, method, status: response.status, url: this.baseUrl },
        });
        throw new Error(`Zabbix HTTP error ${response.status} (traceId: ${traceId})`);
      }

      const body = (await response.json()) as ZabbixResponse<T>;
      if (body.error) {
        await writeSystemLog({
          category: 'ZABBIX_API',
          level: 'ERROR',
          message: `Zabbix error ${body.error.code}: ${body.error.message}`,
          meta: {
            traceId,
            method,
            code: body.error.code,
            error: body.error.message,
            errorData: body.error.data ?? null,
            url: this.baseUrl,
          },
        });
        throw new Error(`Zabbix error ${body.error.code}: ${body.error.message} (traceId: ${traceId})`);
      }

      return body.result as T;
    } catch (error) {
      if (error instanceof Error && error.message.includes('traceId:')) {
        throw error;
      }
      await writeSystemLog({
        category: 'ZABBIX_API',
        level: 'ERROR',
        message: 'Zabbix request failed',
        meta: {
          traceId,
          method,
          url: this.baseUrl,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw new Error(`Zabbix request failed (traceId: ${traceId})`);
    }
  }

  async login(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }
    this.authToken = await this.request<string>('user.login', {
      user: this.user,
      password: this.password,
    });
    return this.authToken;
  }

  async hostGet(hostId: string) {
    const token = await this.login();
    const result = await this.request<Array<{ hostid: string; host: string }>>(
      'host.get',
      {
        hostids: [hostId],
        output: ['hostid', 'host'],
      },
      token,
    );
    return result[0] ?? null;
  }

  async itemGet(hostId: string, itemKeys: string[]) {
    const token = await this.login();
    return this.request<
      Array<{
        itemid: string;
        key_: string;
        name: string;
        lastvalue: string;
        units: string;
        lastclock: string;
      }>
    >(
      'item.get',
      {
        hostids: [hostId],
        search: {
          key_: itemKeys,
        },
        searchByAny: true,
        output: ['itemid', 'key_', 'name', 'lastvalue', 'units', 'lastclock'],
      },
      token,
    );
  }

  async templateList() {
    const token = await this.login();
    return this.request<Array<{ templateid: string; host: string; name: string }>>(
      'template.get',
      {
        output: ['templateid', 'host', 'name'],
        sortfield: 'host',
        sortorder: 'ASC',
      },
      token,
    );
  }

  async templateItems(templateId: string) {
    const token = await this.login();
    return this.request<Array<{ itemid: string; key_: string; name: string }>>(
      'item.get',
      {
        templateids: [templateId],
        output: ['itemid', 'key_', 'name'],
        sortfield: 'key_',
        sortorder: 'ASC',
      },
      token,
    );
  }
}

export function createZabbixClient() {
  if (!env.ZABBIX_URL || !env.ZABBIX_USER || !env.ZABBIX_PASS) {
    throw new Error('Zabbix credentials are not configured');
  }
  return new ZabbixClient(`${env.ZABBIX_URL}/api_jsonrpc.php`, env.ZABBIX_USER, env.ZABBIX_PASS);
}
