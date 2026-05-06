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

const snmpVersionSchema = z.enum(['V2C', 'V3']);
const snmpAuthProtocolSchema = z.enum(['MD5', 'SHA']);
const snmpPrivProtocolSchema = z.enum(['DES', 'AES']);

const deviceSnmpSchema = z
  .object({
    version: snmpVersionSchema,
    port: z.coerce.number().int().min(1).max(65535).default(161),
    community: z.string().trim().min(1).max(200).optional().nullable(),
    username: z.string().trim().min(1).max(120).optional().nullable(),
    authProtocol: snmpAuthProtocolSchema.optional().nullable(),
    authPassword: z.string().trim().min(1).max(200).optional().nullable(),
    privProtocol: snmpPrivProtocolSchema.optional().nullable(),
    privPassword: z.string().trim().min(1).max(200).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.version === 'V2C' && !value.community) {
      ctx.addIssue({
        code: 'custom',
        path: ['community'],
        message: 'SNMP community is required for SNMP v2c',
      });
    }

    if (value.version === 'V3') {
      if (!value.username) {
        ctx.addIssue({
          code: 'custom',
          path: ['username'],
          message: 'SNMP v3 username is required',
        });
      }
      if (!value.authProtocol) {
        ctx.addIssue({
          code: 'custom',
          path: ['authProtocol'],
          message: 'SNMP v3 auth protocol is required',
        });
      }
      if (!value.authPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['authPassword'],
          message: 'SNMP v3 auth password is required',
        });
      }
      if ((value.privProtocol && !value.privPassword) || (!value.privProtocol && value.privPassword)) {
        ctx.addIssue({
          code: 'custom',
          path: value.privProtocol ? ['privPassword'] : ['privProtocol'],
          message: 'SNMP v3 privacy protocol and password must be provided together',
        });
      }
    }
  });

const deviceSnmpUpdateSchema = z
  .object({
    version: snmpVersionSchema,
    port: z.coerce.number().int().min(1).max(65535).optional(),
    community: z.string().trim().min(1).max(200).optional().nullable(),
    username: z.string().trim().min(1).max(120).optional().nullable(),
    authProtocol: snmpAuthProtocolSchema.optional().nullable(),
    authPassword: z.string().trim().min(1).max(200).optional().nullable(),
    privProtocol: snmpPrivProtocolSchema.optional().nullable(),
    privPassword: z.string().trim().min(1).max(200).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.version === 'V3' && value.privProtocol === null && value.privPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['privProtocol'],
        message: 'SNMP v3 privacy protocol and password must be provided together',
      });
    }
    if (value.version === 'V3' && value.privPassword === null && value.privProtocol) {
      ctx.addIssue({
        code: 'custom',
        path: ['privPassword'],
        message: 'SNMP v3 privacy protocol and password must be provided together',
      });
    }
  });

export const deviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ip: z.ipv4(),
  vendor: z.string().trim().max(120).optional().nullable(),
  type: z.string().trim().max(120).optional().nullable(),
  siteId: z.string().trim().min(1).max(120).optional().nullable(),
  snmp: deviceSnmpSchema.optional().nullable(),
  deviceGroupIds: z.array(z.string().min(1)).default([]),
});

export const deviceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  ip: z.ipv4().optional(),
  vendor: z.string().trim().max(120).optional().nullable(),
  type: z.string().trim().max(120).optional().nullable(),
  siteId: z.string().trim().min(1).max(120).optional().nullable(),
  snmp: deviceSnmpUpdateSchema.optional().nullable(),
  deviceGroupIds: z.array(z.string().min(1)).optional(),
});

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

