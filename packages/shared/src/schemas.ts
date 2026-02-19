import { z } from 'zod';

export const passwordPolicy = z
  .string()
  .min(12, 'Password must be at least 12 characters long');

export const registerSchema = z.object({
  email: z.email(),
  password: passwordPolicy,
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.email(),
});

export const passwordResetSchema = z.object({
  email: z.email(),
  token: z.string().min(16),
  password: passwordPolicy,
});

export const groupCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const groupUpdateSchema = groupCreateSchema.partial();

export const assignGroupMembersSchema = z.object({
  userIds: z.array(z.string().min(1)).default([]),
});

export const deviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ip: z.ipv4(),
  vendor: z.string().trim().max(120).optional().nullable(),
  type: z.string().trim().max(120).optional().nullable(),
  zabbixHostId: z.string().trim().max(120).optional().nullable(),
  deviceGroupIds: z.array(z.string().min(1)).default([]),
});

export const deviceUpdateSchema = deviceCreateSchema.partial();

export const deviceGroupCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional().nullable(),
  allowedGroupIds: z.array(z.string().min(1)).default([]),
});

export const deviceGroupUpdateSchema = deviceGroupCreateSchema.partial();

export const userUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  groupIds: z.array(z.string().min(1)).optional(),
});

export const zabbixSyncRequestSchema = z.object({
  deviceIds: z.array(z.string().min(1)).optional(),
  force: z.boolean().default(false),
});
