import { describe, expect, it } from 'vitest';
import { createOpaqueToken, hashToken } from '@/lib/crypto';

describe('token hashing', () => {
  it('stores only deterministic hash and keeps token opaque', () => {
    const token = createOpaqueToken();
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token.slice(0, 8));
    expect(hashToken(token)).toEqual(hash);
  });
});
