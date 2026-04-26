import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  deviceType: {
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

const listRouteModule = await import('../../app/api/catalog/device-types/route');
const itemRouteModule = await import('../../app/api/catalog/device-types/[id]/route');

describe('device type catalog routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ csrfSecret: 'csrf-secret', user: { role: 'ADMIN' } });
  });

  it('lists device types for admin requests', async () => {
    prismaMock.deviceType.findMany.mockResolvedValueOnce([
      {
        id: 'dt-1',
        name: 'Router',
        vendor: 'MikroTik',
        photoDataUrl: 'data:image/png;base64,AAAA',
        createdAt: '2026-04-26T00:00:00.000Z',
      },
    ]);

    const response = await listRouteModule.GET(new Request('http://localhost/api/catalog/device-types') as never);
    const body = await response.json();

    expect(prismaMock.deviceType.findMany).toHaveBeenCalledWith({ orderBy: [{ vendor: 'asc' }, { name: 'asc' }] });
    expect(body.data).toHaveLength(1);
    expect(body.data[0].photoDataUrl).toBe('data:image/png;base64,AAAA');
  });

  it('creates a new device type with photo', async () => {
    prismaMock.deviceType.create.mockResolvedValueOnce({ id: 'dt-2', name: 'Switch', photoDataUrl: 'data:image/png;base64,BBBB' });

    const response = await listRouteModule.POST(
      new Request('http://localhost/api/catalog/device-types', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          name: 'Switch',
          vendor: 'Cisco',
          photoDataUrl: 'data:image/png;base64,BBBB',
        }),
      }) as never,
    );
    const body = await response.json();

    expect(assertCsrfMock).toHaveBeenCalled();
    expect(prismaMock.deviceType.create).toHaveBeenCalledWith({
      data: {
        name: 'Switch',
        vendor: 'Cisco',
        photoDataUrl: 'data:image/png;base64,BBBB',
      },
    });
    expect(response.status).toBe(201);
    expect(body.data.id).toBe('dt-2');
  });

  it('updates an existing device type and can clear photo', async () => {
    prismaMock.deviceType.update.mockResolvedValueOnce({ id: 'dt-3', name: 'Firewall', photoDataUrl: null });

    const response = await itemRouteModule.PATCH(
      new Request('http://localhost/api/catalog/device-types/dt-3', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          name: 'Firewall',
          vendor: null,
          photoDataUrl: null,
        }),
      }) as never,
      { params: Promise.resolve({ id: 'dt-3' }) },
    );
    const body = await response.json();

    expect(prismaMock.deviceType.update).toHaveBeenCalledWith({
      where: { id: 'dt-3' },
      data: {
        name: 'Firewall',
        vendor: null,
        photoDataUrl: null,
      },
    });
    expect(body.data.id).toBe('dt-3');
  });

  it('deletes a device type by id', async () => {
    prismaMock.deviceType.delete.mockResolvedValueOnce({ id: 'dt-4' });

    const response = await itemRouteModule.DELETE(
      new Request('http://localhost/api/catalog/device-types/dt-4', {
        method: 'DELETE',
        headers: { 'x-csrf-token': 'csrf-secret' },
      }) as never,
      { params: Promise.resolve({ id: 'dt-4' }) },
    );
    const body = await response.json();

    expect(prismaMock.deviceType.delete).toHaveBeenCalledWith({ where: { id: 'dt-4' } });
    expect(body.ok).toBe(true);
  });
});