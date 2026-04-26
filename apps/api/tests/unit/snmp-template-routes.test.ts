import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  snmpOidTemplate: {
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

const listRouteModule = await import('../../app/api/catalog/snmp-templates/route');
const itemRouteModule = await import('../../app/api/catalog/snmp-templates/[id]/route');

describe('SNMP template catalog routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ csrfSecret: 'csrf-secret', user: { role: 'ADMIN' } });
  });

  it('lists SNMP templates for admin requests', async () => {
    prismaMock.snmpOidTemplate.findMany.mockResolvedValueOnce([
      { id: '1', vendor: 'MikroTik', deviceType: null, metricKey: 'softwareVersion', oid: '1.2.3', enabled: true },
    ]);

    const response = await listRouteModule.GET(new Request('http://localhost/api/catalog/snmp-templates') as never);
    const body = await response.json();

    expect(prismaMock.snmpOidTemplate.findMany).toHaveBeenCalledWith({
      orderBy: [{ vendor: 'asc' }, { deviceType: 'asc' }, { metricKey: 'asc' }],
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0].vendor).toBe('MikroTik');
  });

  it('creates a new SNMP template with normalized nullable fields', async () => {
    prismaMock.snmpOidTemplate.create.mockResolvedValueOnce({ id: '2', metricKey: 'hostname', oid: '1.3.6.1.2.1.1.5.0' });

    const response = await listRouteModule.POST(
      new Request('http://localhost/api/catalog/snmp-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          vendor: '',
          deviceType: '',
          metricKey: 'hostname',
          oid: '1.3.6.1.2.1.1.5.0',
          enabled: true,
        }),
      }) as never,
    );
    const body = await response.json();

    expect(assertCsrfMock).toHaveBeenCalled();
    expect(prismaMock.snmpOidTemplate.create).toHaveBeenCalledWith({
      data: {
        vendor: null,
        deviceType: null,
        metricKey: 'hostname',
        oid: '1.3.6.1.2.1.1.5.0',
        enabled: true,
      },
    });
    expect(response.status).toBe(201);
    expect(body.data.id).toBe('2');
  });

  it('updates an existing SNMP template', async () => {
    prismaMock.snmpOidTemplate.update.mockResolvedValueOnce({ id: 'row-1', metricKey: 'uptime', oid: '1.3.6.1.2.1.1.3.0' });

    const response = await itemRouteModule.PATCH(
      new Request('http://localhost/api/catalog/snmp-templates/row-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-secret',
        },
        body: JSON.stringify({
          vendor: 'MikroTik',
          deviceType: null,
          metricKey: 'uptime',
          oid: '1.3.6.1.2.1.1.3.0',
          enabled: false,
        }),
      }) as never,
      { params: Promise.resolve({ id: 'row-1' }) },
    );
    const body = await response.json();

    expect(prismaMock.snmpOidTemplate.update).toHaveBeenCalledWith({
      where: { id: 'row-1' },
      data: {
        vendor: 'MikroTik',
        deviceType: null,
        metricKey: 'uptime',
        oid: '1.3.6.1.2.1.1.3.0',
        enabled: false,
      },
    });
    expect(body.data.id).toBe('row-1');
  });

  it('deletes an SNMP template by id', async () => {
    prismaMock.snmpOidTemplate.delete.mockResolvedValueOnce({ id: 'row-2' });

    const response = await itemRouteModule.DELETE(
      new Request('http://localhost/api/catalog/snmp-templates/row-2', {
        method: 'DELETE',
        headers: { 'x-csrf-token': 'csrf-secret' },
      }) as never,
      { params: Promise.resolve({ id: 'row-2' }) },
    );
    const body = await response.json();

    expect(prismaMock.snmpOidTemplate.delete).toHaveBeenCalledWith({ where: { id: 'row-2' } });
    expect(body.ok).toBe(true);
  });
});