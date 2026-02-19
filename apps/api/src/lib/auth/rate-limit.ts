import { ApiError } from '@/lib/errors';
import { redis } from '@/lib/redis';

export async function assertRateLimit(params: {
  bucket: string;
  limit: number;
  windowSec: number;
}): Promise<void> {
  try {
    const key = `rl:${params.bucket}`;
    const transaction = redis.multi();
    transaction.incr(key);
    transaction.expire(key, params.windowSec, 'NX');
    const result = await transaction.exec();
    const current = Number(result?.[0]?.[1] ?? 0);
    if (current > params.limit) {
      throw new ApiError(429, 'RATE_LIMITED', 'Too many requests');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Fail-open if Redis is unavailable to avoid blocking valid users.
  }
}
