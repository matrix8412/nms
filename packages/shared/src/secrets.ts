import crypto from 'node:crypto';

const SECRET_PREFIX = 'enc:v1:';
const IV_LENGTH = 12;

function deriveKey(encryptionKey: string) {
  return crypto.createHash('sha256').update(encryptionKey).digest();
}

export function encryptSecret(value: string, encryptionKey: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return normalized;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(encryptionKey), iv);
  const ciphertext = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${SECRET_PREFIX}${iv.toString('base64url')}.${authTag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptSecret(value: string, encryptionKey: string): string {
  if (!value.startsWith(SECRET_PREFIX)) {
    return value;
  }

  const payload = value.slice(SECRET_PREFIX.length);
  const [ivEncoded, authTagEncoded, ciphertextEncoded] = payload.split('.');
  if (!ivEncoded || !authTagEncoded || !ciphertextEncoded) {
    throw new Error('Encrypted secret payload is malformed');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveKey(encryptionKey),
    Buffer.from(ivEncoded, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

export function decryptSecretOrNull(value: string | null | undefined, encryptionKey: string): string | null {
  if (!value) {
    return null;
  }
  return decryptSecret(value, encryptionKey);
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(SECRET_PREFIX));
}