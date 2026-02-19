export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
  }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error');
}
