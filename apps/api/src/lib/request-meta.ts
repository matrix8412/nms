import type { NextRequest } from 'next/server';

export function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
  );
}

export function getUserAgent(request: NextRequest): string | null {
  return request.headers.get('user-agent');
}
