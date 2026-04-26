import { describe, expect, it } from 'vitest';
import { deviceCreateSchema, deviceUpdateSchema, registerSchema } from '@nms/shared';

describe('registerSchema', () => {
  it('enforces minimum password length', () => {
    const parsed = registerSchema.safeParse({
      email: 'user@kinet.sk',
      password: 'short',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid payload', () => {
    const parsed = registerSchema.safeParse({
      email: 'user@kinet.sk',
      password: 'LongEnoughPassword123!',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('device SNMP schemas', () => {
  it('requires SNMP v2c community on create', () => {
    const parsed = deviceCreateSchema.safeParse({
      name: 'Router 01',
      ip: '10.0.0.1',
      snmp: {
        version: 'V2C',
        port: 161,
      },
      deviceGroupIds: [],
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts SNMP v3 update without resending stored secrets', () => {
    const parsed = deviceUpdateSchema.safeParse({
      snmp: {
        version: 'V3',
        port: 161,
        username: 'monitor',
        authProtocol: 'SHA',
      },
    });

    expect(parsed.success).toBe(true);
  });
});
