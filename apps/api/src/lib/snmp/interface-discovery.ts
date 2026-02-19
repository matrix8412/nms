export type InterfaceRecord = {
  index: number;
  name: string;
  adminStatus?: string;
  operStatus?: string;
  speedBps?: number;
};

export type DiscoveryRequest = {
  ip: string;
  vendor?: string | null;
  model?: string | null;
};

export interface InterfaceDiscoveryProvider {
  supports(request: DiscoveryRequest): boolean;
  discover(request: DiscoveryRequest): Promise<InterfaceRecord[]>;
}

export class IfMibDiscoveryRegistry {
  constructor(private readonly providers: InterfaceDiscoveryProvider[]) {}

  async discover(request: DiscoveryRequest): Promise<InterfaceRecord[]> {
    const provider = this.providers.find((item) => item.supports(request));
    if (!provider) {
      return [];
    }
    return provider.discover(request);
  }
}

// Vendor-specific providers can be registered here when SNMP implementation is added.
export const ifMibDiscoveryRegistry = new IfMibDiscoveryRegistry([]);
