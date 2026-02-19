import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('password utils', () => {
  it('hashes and verifies password with argon2id/bcrypt fallback', async () => {
    const plain = 'VeryStrongPassword123!';
    const hash = await hashPassword(plain);
    expect(hash).not.toEqual(plain);
    expect(await verifyPassword(hash, plain)).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });
});
