import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:4200'),
  COMPANY_EMAIL_DOMAIN: z.string().default('@kinet.sk'),
  DATABASE_URL: z.string().min(1).default('postgresql://nms:nms@localhost:5432/nms?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ENCRYPTION_KEY: z.string().min(1).default('dev-only-insecure-key-change-me'),
  EMAIL_FROM: z.email().default('nms-dev@kinet.sk'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
});

export const env = envSchema.parse(process.env);

export const isProd = env.NODE_ENV === 'production';
export const isSecure = env.APP_URL.startsWith('https://');
