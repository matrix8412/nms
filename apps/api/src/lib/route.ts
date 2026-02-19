import { fail } from './response';

export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T | ReturnType<typeof fail>> {
  try {
    return await fn();
  } catch (error) {
    return fail(error);
  }
}
