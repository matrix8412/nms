import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  integrationConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

const requireAdminMock = vi.fn();
const assertCsrfMock = vi.fn();

vi.mock('@nms/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/auth/session', () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock('@/lib/auth/csrf', () => ({
  assertCsrf: assertCsrfMock,
}));

const routeModule = await import('../../app/api/integrations/[provider]/route');

describe('integration provider routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ csrfSecret: 'csrf-secret', user: { role: 'ADMIN' } });
  });

  it('returns ICMP defaults including history retention days when config is missing', async () => {
    prismaMock.integrationConfig.findUnique.mockResolvedValueOnce(null);

    const response = await routeModule.GET(
      new Request('http://localhost/api/integrations/icmp') as never,
      { params: Promise.resolve({ provider: 'icmp' }) },
    );
    const body = await response.json();

    expect(body.data).toEqual({
      provider: 'icmp',
      enabled: true,
      settings: {
        intervalSec: 120,
        timeoutSec: 3,
        retries: 2,
        historyRetentionDays: 30,
      },
    });
  });

  it('coerces ICMP numeric settings before persisting', async () => {
    prismaMock.integrationConfig.upsert.mockResolvedValueOnce({
      provider: 'icmp',
      enabled: true,
      settings: {
        intervalSec: 300,
        timeoutSec: 5,
        retries: 3,
        historyRetentionDays: 14,
      },
    });

    const response = await routeModule.PUT(
      new Request('http://localhost/api/integrations/icmp', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          enabled: true,
          settings: {
            intervalSec: '300',
            timeoutSec: '5',
            retries: '3',
            historyRetentionDays: '14',
          },
        }),
      }) as never,
      { params: Promise.resolve({ provider: 'icmp' }) },
    );
    const body = await response.json();

    expect(assertCsrfMock).toHaveBeenCalled();
    expect(prismaMock.integrationConfig.upsert).toHaveBeenCalledWith({
      where: { provider: 'icmp' },
      create: {
        provider: 'icmp',
        enabled: true,
        settings: {
          intervalSec: 300,
          timeoutSec: 5,
          retries: 3,
          historyRetentionDays: 14,
        },
      },
      update: {
        enabled: true,
        settings: {
          intervalSec: 300,
          timeoutSec: 5,
          retries: 3,
          historyRetentionDays: 14,
        },
      },
    });
    expect(body.data.settings.historyRetentionDays).toBe(14);
  });
});
