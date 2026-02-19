import { prisma } from '@nms/db';
import { createOpaqueToken, hashToken } from '@/lib/crypto';

export async function issueVerificationToken(userId: string, expiresAt: Date): Promise<string> {
  const token = createOpaqueToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  return token;
}

export async function issuePasswordResetToken(userId: string, expiresAt: Date): Promise<string> {
  const token = createOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  return token;
}
