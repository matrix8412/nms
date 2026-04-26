import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

process.env.DATABASE_URL ??= 'postgresql://nms:nms@localhost:5432/nms?schema=public';
process.env.ENCRYPTION_KEY ??= 'dev-only-insecure-key-change-me';

const prisma = new PrismaClient();
const SECRET_PREFIX = 'enc:v1:';

function encryptSecret(value: string, encryptionKey: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return normalized;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    crypto.createHash('sha256').update(encryptionKey).digest(),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${SECRET_PREFIX}${iv.toString('base64url')}.${authTag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

function maybeEncrypt(value: string | null, encryptionKey: string) {
  if (!value || value.startsWith(SECRET_PREFIX)) {
    return value;
  }
  return encryptSecret(value, encryptionKey);
}

async function main() {
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  const devices = await prisma.device.findMany({
    where: {
      OR: [
        { snmpCommunity: { not: null } },
        { snmpAuthPassword: { not: null } },
        { snmpPrivPassword: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      snmpCommunity: true,
      snmpAuthPassword: true,
      snmpPrivPassword: true,
    },
  });

  let updatedDevices = 0;
  let updatedFields = 0;

  for (const device of devices) {
    const snmpCommunity = maybeEncrypt(device.snmpCommunity, encryptionKey);
    const snmpAuthPassword = maybeEncrypt(device.snmpAuthPassword, encryptionKey);
    const snmpPrivPassword = maybeEncrypt(device.snmpPrivPassword, encryptionKey);

    const changed =
      snmpCommunity !== device.snmpCommunity ||
      snmpAuthPassword !== device.snmpAuthPassword ||
      snmpPrivPassword !== device.snmpPrivPassword;

    if (!changed) {
      continue;
    }

    await prisma.device.update({
      where: { id: device.id },
      data: {
        snmpCommunity,
        snmpAuthPassword,
        snmpPrivPassword,
      },
    });

    updatedDevices += 1;
    updatedFields += Number(snmpCommunity !== device.snmpCommunity);
    updatedFields += Number(snmpAuthPassword !== device.snmpAuthPassword);
    updatedFields += Number(snmpPrivPassword !== device.snmpPrivPassword);

    console.log(`Re-encrypted SNMP secrets for ${device.name}`);
  }

  console.log(`Backfill complete. Updated ${updatedDevices} devices and ${updatedFields} secret fields.`);
}

main()
  .catch((error) => {
    console.error('Backfill error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });