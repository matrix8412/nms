import { describe, it } from 'vitest';

describe('auth endpoint integration (test DB)', () => {
  it.skip('register -> verify-email -> login -> request-reset -> reset', async () => {
    // Skeleton placeholder:
    // 1) Start API with DATABASE_URL pointed to isolated test Postgres.
    // 2) Use fetch/supertest to call:
    //    POST /api/auth/register
    //    GET /api/auth/verify-email
    //    POST /api/auth/login
    //    POST /api/auth/password/request-reset
    //    POST /api/auth/password/reset
    // 3) Assert audit log rows were created for success/failure events.
    // 4) Assert tokens are stored as hashes and sessions created in DB.
  });
});
