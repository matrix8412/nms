import { NextResponse } from 'next/server';
import { asApiError } from './errors';

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(error: unknown): NextResponse {
  const parsed = asApiError(error);
  return NextResponse.json(
    {
      code: parsed.code,
      message: parsed.message,
      details: parsed.details,
    },
    { status: parsed.status },
  );
}
