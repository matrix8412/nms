import Redis from 'ioredis';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __nmsRedis: Redis | undefined;
}

export const redis =
  globalThis.__nmsRedis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
  });

redis.on('error', () => {
  // Intentionally suppress noisy connection errors; callers handle Redis failures.
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__nmsRedis = redis;
}
