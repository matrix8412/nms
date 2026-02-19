import { describe, expect, it } from 'vitest';
import { registerSchema } from '@nms/shared';

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
