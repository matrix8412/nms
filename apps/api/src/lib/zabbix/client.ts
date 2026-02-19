import { env } from '@/lib/env';

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
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Zabbix HTTP error ${response.status}`);
    }

    const body = (await response.json()) as ZabbixResponse<T>;
    if (body.error) {
      throw new Error(`Zabbix error ${body.error.code}: ${body.error.message}`);
    }
    return body.result as T;
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
}

export function createZabbixClient() {
  if (!env.ZABBIX_URL || !env.ZABBIX_USER || !env.ZABBIX_PASS) {
    throw new Error('Zabbix credentials are not configured');
  }
  return new ZabbixClient(`${env.ZABBIX_URL}/api_jsonrpc.php`, env.ZABBIX_USER, env.ZABBIX_PASS);
}
