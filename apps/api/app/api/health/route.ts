import { ok } from '@/lib/response';

export async function GET() {
  return ok({
    status: 'ok',
    service: 'api',
    now: new Date().toISOString(),
  });
}
