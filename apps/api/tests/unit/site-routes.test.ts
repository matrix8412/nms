import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  site: {
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

const listRouteModule = await import('../../app/api/catalog/sites/route');
const itemRouteModule = await import('../../app/api/catalog/sites/[id]/route');

describe('site catalog routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ csrfSecret: 'csrf-secret', user: { role: 'ADMIN' } });
  });

  it('lists sites for admin requests', async () => {
    prismaMock.site.findMany.mockResolvedValueOnce([
      {
        id: 'site-1',
        name: 'HQ',
        street: 'Main',
        descriptiveNumber: '12',
        orientationNumber: '4',
        zipNumber: '81101',
        city: 'Bratislava',
        latitude: 48.1485965,
        longitude: 17.1077477,
        description: null,
      },
    ]);

    const response = await listRouteModule.GET(new Request('http://localhost/api/catalog/sites') as never);
    const body = await response.json();

    expect(prismaMock.site.findMany).toHaveBeenCalledWith({ orderBy: [{ name: 'asc' }] });
    expect(body.data[0].name).toBe('HQ');
  });

  it('creates a site with coordinates', async () => {
    prismaMock.site.create.mockResolvedValueOnce({ id: 'site-2', name: 'Branch' });

    const response = await listRouteModule.POST(
      new Request('http://localhost/api/catalog/sites', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          name: 'Branch',
          street: 'Nova',
          descriptiveNumber: '34',
          orientationNumber: null,
          zipNumber: '04001',
          city: 'Kosice',
          latitude: 48.716385,
          longitude: 21.261074,
          description: 'Regional office',
        }),
      }) as never,
    );
    const body = await response.json();

    expect(assertCsrfMock).toHaveBeenCalled();
    expect(prismaMock.site.create).toHaveBeenCalledWith({
      data: {
        name: 'Branch',
        street: 'Nova',
        descriptiveNumber: '34',
        orientationNumber: null,
        zipNumber: '04001',
        city: 'Kosice',
        latitude: 48.716385,
        longitude: 21.261074,
        description: 'Regional office',
      },
    });
    expect(response.status).toBe(201);
    expect(body.data.id).toBe('site-2');
  });

  it('updates a site', async () => {
    prismaMock.site.update.mockResolvedValueOnce({ id: 'site-3', name: 'Datacenter' });

    const response = await itemRouteModule.PATCH(
      new Request('http://localhost/api/catalog/sites/site-3', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          name: 'Datacenter',
          street: 'Serverova',
          descriptiveNumber: '9',
          orientationNumber: 'A',
          zipNumber: '91701',
          city: 'Trnava',
          latitude: 48.3774,
          longitude: 17.5872,
          description: null,
        }),
      }) as never,
      { params: Promise.resolve({ id: 'site-3' }) },
    );
    const body = await response.json();

    expect(prismaMock.site.update).toHaveBeenCalledWith({
      where: { id: 'site-3' },
      data: {
        name: 'Datacenter',
        street: 'Serverova',
        descriptiveNumber: '9',
        orientationNumber: 'A',
        zipNumber: '91701',
        city: 'Trnava',
        latitude: 48.3774,
        longitude: 17.5872,
        description: null,
      },
    });
    expect(body.data.id).toBe('site-3');
  });

  it('deletes a site by id', async () => {
    prismaMock.site.delete.mockResolvedValueOnce({ id: 'site-4' });

    const response = await itemRouteModule.DELETE(
      new Request('http://localhost/api/catalog/sites/site-4', {
        method: 'DELETE',
        headers: { 'x-csrf-token': 'csrf-secret' },
      }) as never,
      { params: Promise.resolve({ id: 'site-4' }) },
    );
    const body = await response.json();

    expect(prismaMock.site.delete).toHaveBeenCalledWith({ where: { id: 'site-4' } });
    expect(body.ok).toBe(true);
  });
});
