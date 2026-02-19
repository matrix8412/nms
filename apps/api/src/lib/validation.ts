import { ApiError } from './errors';
import { z } from 'zod';

export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(400, 'BAD_REQUEST', 'Validation failed', parsed.error.flatten());
  }
  return parsed.data;
}
