import { z } from 'zod';

const envSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ENCRYPTION_KEY: z.string().min(1).default('dev-only-insecure-key-change-me'),
});

export const env = envSchema.parse(process.env);
