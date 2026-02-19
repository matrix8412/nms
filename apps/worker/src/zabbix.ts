export class ZabbixClient {
  private authToken: string | null = null;
  private idCounter = 1;

  constructor(
    private readonly baseUrl: string,
    private readonly user: string,
    private readonly password: string,
  ) {}

  private async request<T>(method: string, params: unknown, auth?: string | null): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        auth,
        id: this.idCounter++,
      }),
    });

    if (!response.ok) {
      throw new Error(`Zabbix HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      result?: T;
      error?: { code: number; message: string };
    };
    if (body.error) {
      throw new Error(`Zabbix error ${body.error.code}: ${body.error.message}`);
    }
    return body.result as T;
  }

  async login() {
    if (this.authToken) return this.authToken;
    this.authToken = await this.request<string>('user.login', {
      user: this.user,
      password: this.password,
    });
    return this.authToken;
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
        search: { key_: itemKeys },
        searchByAny: true,
        output: ['itemid', 'key_', 'name', 'lastvalue', 'units', 'lastclock'],
      },
      token,
    );
  }
}
