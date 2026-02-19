import { prisma } from '@nms/db';
import type { User } from '@nms/db';
import { env } from '@/lib/env';
import { ApiError } from '@/lib/errors';
import { hashPassword, verifyPassword } from '@/lib/password';
import { issuePasswordResetToken, issueVerificationToken } from '@/lib/auth/token-service';
import { hashToken } from '@/lib/crypto';
import { sendEmail } from '@/lib/email';
import { writeAuditLog } from '@/lib/audit';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function ensureCorporateEmail(email: string): void {
  const allowedDomain = env.COMPANY_EMAIL_DOMAIN.toLowerCase();
  if (!email.toLowerCase().endsWith(allowedDomain)) {
    throw new ApiError(400, 'BAD_REQUEST', `Only ${allowedDomain} accounts can register`);
  }
}

export async function registerUser(params: {
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true }> {
  const email = normalizeEmail(params.email);
  ensureCorporateEmail(email);

  const passwordHash = await hashPassword(params.password);
  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  } catch {
    throw new ApiError(409, 'CONFLICT', 'User already exists');
  }

  const token = await issueVerificationToken(user.id, new Date(Date.now() + 24 * 60 * 60 * 1000));
  const verifyUrl = `${env.APP_URL}/auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: 'Verify your NMS account',
    html: `<p>Verify your account by visiting <a href="${verifyUrl}">${verifyUrl}</a>. Link expires in 24 hours.</p>`,
  });

  await writeAuditLog({
    userId: user.id,
    action: 'register',
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { ok: true };
}

export async function verifyEmail(params: {
  email: string;
  token: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true }> {
  const email = normalizeEmail(params.email);
  const tokenHash = hashToken(params.token);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await writeAuditLog({
      action: 'verify_email_failure',
      ip: params.ip,
      userAgent: params.userAgent,
      meta: { reason: 'missing_user', email },
    });
    throw new ApiError(400, 'BAD_REQUEST', 'Invalid verification token');
  }

  const record = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    await writeAuditLog({
      userId: user.id,
      action: 'verify_email_failure',
      ip: params.ip,
      userAgent: params.userAgent,
      meta: { reason: 'invalid_token' },
    });
    throw new ApiError(400, 'BAD_REQUEST', 'Invalid verification token');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    userId: user.id,
    action: 'verify_email_success',
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { ok: true };
}

export async function loginUser(params: {
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ userId: string }> {
  const email = normalizeEmail(params.email);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.emailVerifiedAt) {
    await writeAuditLog({
      userId: user?.id ?? null,
      action: 'login_failure',
      ip: params.ip,
      userAgent: params.userAgent,
      meta: { reason: user ? 'unverified' : 'missing_user' },
    });
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  const valid = await verifyPassword(user.passwordHash, params.password);
  if (!valid) {
    await writeAuditLog({
      userId: user.id,
      action: 'login_failure',
      ip: params.ip,
      userAgent: params.userAgent,
      meta: { reason: 'password' },
    });
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  await writeAuditLog({
    userId: user.id,
    action: 'login_success',
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { userId: user.id };
}

export async function requestPasswordReset(params: {
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true }> {
  const email = normalizeEmail(params.email);
  const user = await prisma.user.findUnique({ where: { email } });

  await writeAuditLog({
    userId: user?.id ?? null,
    action: 'password_reset_request',
    ip: params.ip,
    userAgent: params.userAgent,
  });

  if (!user || !user.emailVerifiedAt) {
    return { ok: true };
  }

  const token = await issuePasswordResetToken(user.id, new Date(Date.now() + 45 * 60 * 1000));
  const resetUrl = `${env.APP_URL}/auth/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: 'NMS password reset',
    html: `<p>Reset your password by visiting <a href="${resetUrl}">${resetUrl}</a>. Link expires in 45 minutes.</p>`,
  });

  return { ok: true };
}

export async function resetPassword(params: {
  email: string;
  token: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true }> {
  const email = normalizeEmail(params.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await writeAuditLog({
      action: 'password_reset_failure',
      ip: params.ip,
      userAgent: params.userAgent,
      meta: { reason: 'missing_user' },
    });
    throw new ApiError(400, 'BAD_REQUEST', 'Invalid reset token');
  }

  const tokenHash = hashToken(params.token);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    await writeAuditLog({
      userId: user.id,
      action: 'password_reset_failure',
      ip: params.ip,
      userAgent: params.userAgent,
      meta: { reason: 'invalid_token' },
    });
    throw new ApiError(400, 'BAD_REQUEST', 'Invalid reset token');
  }

  const passwordHash = await hashPassword(params.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  await writeAuditLog({
    userId: user.id,
    action: 'password_reset_success',
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { ok: true };
}
