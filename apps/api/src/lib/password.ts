import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

const ARGON_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 3,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, ARGON_OPTIONS);
  } catch {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (hash.startsWith('$argon2')) {
    return argon2.verify(hash, password);
  }

  return bcrypt.compare(password, hash);
}
