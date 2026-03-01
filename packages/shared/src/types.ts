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

export type DeviceDto = {
  id: string;
  name: string;
  ip: string;
  vendor?: string | null;
  type?: string | null;
  zabbixHostId?: string | null;
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
