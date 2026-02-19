import { ApiError } from '@/lib/errors';
import { safeEqualString } from '@/lib/crypto';
import type { NextRequest } from 'next/server';
import { CSRF_ANON_COOKIE, CSRF_COOKIE } from './constants';

export function assertCsrf(request: NextRequest, expectedToken?: string): void {
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfHeader) {
    throw new ApiError(403, 'FORBIDDEN', 'Missing CSRF token');
  }

  if (expectedToken) {
    if (!safeEqualString(csrfHeader, expectedToken)) {
      throw new ApiError(403, 'FORBIDDEN', 'Invalid CSRF token');
    }
    return;
  }

  const cookieToken =
    request.cookies.get(CSRF_COOKIE)?.value ?? request.cookies.get(CSRF_ANON_COOKIE)?.value;

  if (!cookieToken || !safeEqualString(csrfHeader, cookieToken)) {
    throw new ApiError(403, 'FORBIDDEN', 'Invalid CSRF token');
  }
}
