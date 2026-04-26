import { z } from 'zod';

export const userRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export type ApiErrorShape = {
  code: string;
  message?: string;
  details?: unknown;
};

export type AuthUserDto = {
  id: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: string | null;
  groups: Array<{ id: string; name: string; roleInGroup?: string | null }>;
};

export type IcmpStatus = 'UNKNOWN' | 'UP' | 'DOWN';

export type SnmpStatus = 'UNKNOWN' | 'UP' | 'DOWN';
export type SnmpVersion = 'V2C' | 'V3';
export type SnmpAuthProtocol = 'MD5' | 'SHA';
export type SnmpPrivProtocol = 'DES' | 'AES';

export type DeviceSnmpDto = {
  version: SnmpVersion;
  port: number;
  username?: string | null;
  authProtocol?: SnmpAuthProtocol | null;
  privProtocol?: SnmpPrivProtocol | null;
  hasCommunity: boolean;
  hasAuthPassword: boolean;
  hasPrivPassword: boolean;
};

export type DeviceInterfaceDto = {
  index: number;
  name: string;
  description?: string | null;
  mac?: string | null;
  operStatus?: string | null;
};

export type DeviceDto = {
  id: string;
  name: string;
  ip: string;
  vendor?: string | null;
  type?: string | null;
  zabbixHostId?: string | null;
  snmp?: DeviceSnmpDto | null;
  snmpStatus: SnmpStatus;
  snmpLastSyncAt?: string | null;
  snmpLastError?: string | null;
  snmpHostname?: string | null;
  snmpSoftwareVersion?: string | null;
  snmpUptimeTicks?: number | null;
  snmpInterfaces?: DeviceInterfaceDto[] | null;
  icmpStatus: IcmpStatus;
  lastPingAt?: string | null;
  lastPingDuration?: number | null;
  groupIds: string[];
};

export type GroupDto = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
