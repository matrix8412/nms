import { z } from 'zod';

const envSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ZABBIX_URL: z.string().default(''),
  ZABBIX_USER: z.string().default(''),
  ZABBIX_PASS: z.string().default(''),
});

export const env = envSchema.parse(process.env);
