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
  metrics?: Record<string, string | number | null> | null;
};

export type SiteDto = {
  id: string;
  name: string;
  street: string;
  descriptiveNumber: string;
  orientationNumber?: string | null;
  zipNumber: string;
  city: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeviceDto = {
  id: string;
  name: string;
  ip: string;
  vendor?: string | null;
  type?: string | null;
  siteId?: string | null;
  site?: SiteDto | null;
  snmp?: DeviceSnmpDto | null;
  snmpStatus: SnmpStatus;
  snmpLastSyncAt?: string | null;
  snmpLastError?: string | null;
  snmpHostname?: string | null;
  snmpSoftwareVersion?: string | null;
  snmpUptimeTicks?: number | null;
  snmpOverviewMetrics?: Record<string, string | number | null> | null;
  snmpInterfaces?: DeviceInterfaceDto[] | null;
  icmpStatus: IcmpStatus;
  lastPingAt?: string | null;
  lastPingDuration?: number | null;
  deviceGroups?: Array<{ id: string; name: string }>;
  groupIds: string[];
};

export type GroupDto = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
