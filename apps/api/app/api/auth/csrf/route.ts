import { NextResponse } from 'next/server';
import { CSRF_ANON_COOKIE } from '@/lib/auth/constants';
import { isSecure } from '@/lib/env';

export async function GET(request: Request) {
  const token =
    request.headers.get('x-csrf-token') ||
    crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');

  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set({
    name: CSRF_ANON_COOKIE,
    value: token,
    httpOnly: false,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
  });
  return response;
}
