import { prisma } from '@nms/db';
import { ApiError } from '@/lib/errors';
import { createOpaqueToken, createSessionId, hashToken } from '@/lib/crypto';
import { isSecure } from '@/lib/env';
import type { NextRequest, NextResponse } from 'next/server';
import { CSRF_COOKIE, SESSION_COOKIE, SESSION_TTL_MS } from './constants';

export type SessionUser = Awaited<ReturnType<typeof resolveSessionUser>>;

async function resolveSessionUser(sessionToken: string) {
  const tokenHash = hashToken(sessionToken);
  const session = await prisma.session.findUnique({
    where: { sessionTokenHash: tokenHash },
    include: {
      user: {
        include: {
          groupMemberships: {
            include: {
              group: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return {
    id: session.id,
    csrfSecret: session.csrfSecret,
    user: session.user,
  };
}

export async function createSession(userId: string) {
  const rawSessionToken = createSessionId();
  const sessionTokenHash = hashToken(rawSessionToken);
  const csrfSecret = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      sessionTokenHash,
      csrfSecret,
      expiresAt,
    },
  });

  return { rawSessionToken, csrfSecret, expiresAt };
}

export function setSessionCookies(
  response: NextResponse,
  session: { rawSessionToken: string; csrfSecret: string; expiresAt: Date },
) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: session.rawSessionToken,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  });

  response.cookies.set({
    name: CSRF_COOKIE,
    value: session.csrfSecret,
    httpOnly: false,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  });
}

export async function clearSession(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { sessionTokenHash: tokenHash } });
  }

  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    maxAge: 0,
    path: '/',
  });

  response.cookies.set({
    name: CSRF_COOKIE,
    value: '',
    maxAge: 0,
    path: '/',
  });
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return resolveSessionUser(token);
}

export async function requireAuth(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return session;
}

export async function requireAdmin(request: NextRequest) {
  const session = await requireAuth(request);
  if (session.user.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', 'Admin role required');
  }
  return session;
}
