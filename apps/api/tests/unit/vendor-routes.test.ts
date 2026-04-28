import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  vendor: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

const listRouteModule = await import('../../app/api/catalog/vendors/route');
const itemRouteModule = await import('../../app/api/catalog/vendors/[id]/route');

describe('vendor catalog routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ csrfSecret: 'csrf-secret', user: { role: 'ADMIN' } });
  });

  it('lists vendors for admin requests', async () => {
    prismaMock.vendor.findMany.mockResolvedValueOnce([
      {
        id: 'vendor-1',
        name: 'MikroTik',
        logoDataUrl: 'data:image/png;base64,AAAA',
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    ]);

    const response = await listRouteModule.GET(new Request('http://localhost/api/catalog/vendors') as never);
    const body = await response.json();

    expect(prismaMock.vendor.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    expect(body.data[0].logoDataUrl).toBe('data:image/png;base64,AAAA');
  });

  it('creates a vendor with logo', async () => {
    prismaMock.vendor.create.mockResolvedValueOnce({ id: 'vendor-2', name: 'Cisco', logoDataUrl: 'data:image/png;base64,BBBB' });

    const response = await listRouteModule.POST(
      new Request('http://localhost/api/catalog/vendors', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          name: 'Cisco',
          logoDataUrl: 'data:image/png;base64,BBBB',
        }),
      }) as never,
    );
    const body = await response.json();

    expect(assertCsrfMock).toHaveBeenCalled();
    expect(prismaMock.vendor.create).toHaveBeenCalledWith({
      data: {
        name: 'Cisco',
        logoDataUrl: 'data:image/png;base64,BBBB',
      },
    });
    expect(response.status).toBe(201);
    expect(body.data.id).toBe('vendor-2');
  });

  it('updates a vendor and can clear logo', async () => {
    prismaMock.vendor.update.mockResolvedValueOnce({ id: 'vendor-3', name: 'Juniper', logoDataUrl: null });

    const response = await itemRouteModule.PATCH(
      new Request('http://localhost/api/catalog/vendors/vendor-3', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          name: 'Juniper',
          logoDataUrl: null,
        }),
      }) as never,
      { params: Promise.resolve({ id: 'vendor-3' }) },
    );
    const body = await response.json();

    expect(prismaMock.vendor.update).toHaveBeenCalledWith({
      where: { id: 'vendor-3' },
      data: {
        name: 'Juniper',
        logoDataUrl: null,
      },
    });
    expect(body.data.id).toBe('vendor-3');
  });

  it('deletes a vendor by id', async () => {
    prismaMock.vendor.delete.mockResolvedValueOnce({ id: 'vendor-4' });

    const response = await itemRouteModule.DELETE(
      new Request('http://localhost/api/catalog/vendors/vendor-4', {
        method: 'DELETE',
        headers: { 'x-csrf-token': 'csrf-secret' },
      }) as never,
      { params: Promise.resolve({ id: 'vendor-4' }) },
    );
    const body = await response.json();

    expect(prismaMock.vendor.delete).toHaveBeenCalledWith({ where: { id: 'vendor-4' } });
    expect(body.ok).toBe(true);
  });
});
