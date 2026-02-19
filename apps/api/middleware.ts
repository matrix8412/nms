import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CSRF_ANON_COOKIE } from '@/lib/auth/constants';

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  applySecurityHeaders(response);

  if (
    ['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !request.cookies.get(CSRF_ANON_COOKIE)?.value
  ) {
    response.cookies.set({
      name: CSRF_ANON_COOKIE,
      value: crypto.randomUUID(),
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
