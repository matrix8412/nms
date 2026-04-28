import { Prisma, prisma } from '@nms/db';
import { encryptSecret } from '@nms/shared/secrets';
import type { DeviceDto, DeviceInterfaceDto, SiteDto } from '@nms/shared';
import type { SessionUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { ApiError } from '@/lib/errors';

type DeviceSnmpInput = {
  version: 'V2C' | 'V3';
  port?: number;
  community?: string | null;
  username?: string | null;
  authProtocol?: 'MD5' | 'SHA' | null;
  authPassword?: string | null;
  privProtocol?: 'DES' | 'AES' | null;
  privPassword?: string | null;
};

type DeviceView = {
  id: string;
  name: string;
  ip: string;
  vendor: string | null;
  type: string | null;
  siteId: string | null;
  zabbixHostId: string | null;
  snmpVersion: 'V2C' | 'V3' | null;
  snmpPort: number;
  snmpUsername: string | null;
  snmpAuthProtocol: 'MD5' | 'SHA' | null;
  snmpPrivProtocol: 'DES' | 'AES' | null;
  snmpCommunity: string | null;
  snmpAuthPassword: string | null;
  snmpPrivPassword: string | null;
  snmpStatus: string;
  snmpLastSyncAt: Date | null;
  snmpLastError: string | null;
  snmpHostname: string | null;
  snmpSoftwareVersion: string | null;
  snmpUptimeTicks: number | null;
  snmpInterfaces: Prisma.JsonValue;
  icmpStatus: string;
  lastPingAt: Date | null;
  lastPingDuration: number | null;
};

type DeviceSiteRecord = {
  id: string;
  name: string;
  street: string;
  descriptiveNumber: string;
  orientationNumber: string | null;
  zipNumber: string;
  city: string;
  latitude: number;
  longitude: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSiteDto(site: DeviceSiteRecord | null | undefined): SiteDto | null {
  if (!site) {
    return null;
  }

  return {
    id: site.id,
    name: site.name,
    street: site.street,
    descriptiveNumber: site.descriptiveNumber,
    orientationNumber: site.orientationNumber,
    zipNumber: site.zipNumber,
    city: site.city,
    latitude: site.latitude,
    longitude: site.longitude,
    description: site.description,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

function encryptOptionalSecret(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? encryptSecret(normalized, env.ENCRYPTION_KEY) : null;
}

function normalizeInterfaces(value: Prisma.JsonValue): DeviceInterfaceDto[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: DeviceInterfaceDto[] = [];

  for (const entry of value) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        continue;
      }

      const record = entry as Record<string, unknown>;
      const index = Number(record.index);
      const name = typeof record.name === 'string' ? record.name : '';
      if (!Number.isInteger(index) || !name) {
        continue;
      }

      items.push({
        index,
        name,
        description: typeof record.description === 'string' ? record.description : null,
        mac: typeof record.mac === 'string' ? record.mac : null,
        operStatus: typeof record.operStatus === 'string' ? record.operStatus : null,
      });
  }

  return items.length > 0 ? items : [];
}

function toDeviceDto(
  device: DeviceView,
  groupIds: string[],
  deviceGroups: Array<{ id: string; name: string }> = [],
  site: SiteDto | null = null,
): DeviceDto {
  return {
    id: device.id,
    name: device.name,
    ip: device.ip,
    vendor: device.vendor,
    type: device.type,
    siteId: device.siteId,
    site,
    zabbixHostId: device.zabbixHostId,
    snmp: device.snmpVersion
      ? {
          version: device.snmpVersion,
          port: device.snmpPort,
          username: device.snmpUsername,
          authProtocol: device.snmpAuthProtocol,
          privProtocol: device.snmpPrivProtocol,
          hasCommunity: Boolean(device.snmpCommunity),
          hasAuthPassword: Boolean(device.snmpAuthPassword),
          hasPrivPassword: Boolean(device.snmpPrivPassword),
        }
      : null,
    snmpStatus: device.snmpStatus as DeviceDto['snmpStatus'],
    snmpLastSyncAt: device.snmpLastSyncAt?.toISOString() ?? null,
    snmpLastError: device.snmpLastError,
    snmpHostname: device.snmpHostname,
    snmpSoftwareVersion: device.snmpSoftwareVersion,
    snmpUptimeTicks: device.snmpUptimeTicks,
    snmpInterfaces: normalizeInterfaces(device.snmpInterfaces),
    icmpStatus: device.icmpStatus as DeviceDto['icmpStatus'],
    lastPingAt: device.lastPingAt?.toISOString() ?? null,
    lastPingDuration: device.lastPingDuration,
    deviceGroups,
    groupIds,
  };
}

function buildSnmpCreateData(snmp?: DeviceSnmpInput | null) {
  if (!snmp) {
    return {};
  }

  return {
    snmpVersion: snmp.version,
    snmpPort: snmp.port ?? 161,
    snmpCommunity: snmp.version === 'V2C' ? encryptOptionalSecret(snmp.community) : null,
    snmpUsername: snmp.version === 'V3' ? snmp.username ?? null : null,
    snmpAuthProtocol: snmp.version === 'V3' ? snmp.authProtocol ?? null : null,
    snmpAuthPassword: snmp.version === 'V3' ? encryptOptionalSecret(snmp.authPassword) : null,
    snmpPrivProtocol: snmp.version === 'V3' ? snmp.privProtocol ?? null : null,
    snmpPrivPassword: snmp.version === 'V3' ? encryptOptionalSecret(snmp.privPassword) : null,
  };
}

function buildSnmpResetData() {
  return {
    snmpVersion: null,
    snmpPort: 161,
    snmpCommunity: null,
    snmpUsername: null,
    snmpAuthProtocol: null,
    snmpAuthPassword: null,
    snmpPrivProtocol: null,
    snmpPrivPassword: null,
    snmpStatus: 'UNKNOWN' as const,
    snmpLastSyncAt: null,
    snmpLastError: null,
    snmpHostname: null,
    snmpSoftwareVersion: null,
    snmpUptimeTicks: null,
    snmpInterfaces: Prisma.JsonNull,
  };
}

function resolveSnmpUpdateData(existing: DeviceView, snmp?: DeviceSnmpInput | null) {
  if (snmp === undefined) {
    return {};
  }

  if (snmp === null) {
    return buildSnmpResetData();
  }

  if (snmp.version === 'V2C') {
    const community = snmp.community ?? (existing.snmpVersion === 'V2C' ? existing.snmpCommunity : null);
    if (!community) {
      throw new ApiError(400, 'BAD_REQUEST', 'SNMP community is required for SNMP v2c');
    }

    return {
      snmpVersion: 'V2C' as const,
      snmpPort: snmp.port ?? existing.snmpPort ?? 161,
      snmpCommunity: snmp.community === undefined ? community : encryptOptionalSecret(snmp.community),
      snmpUsername: null,
      snmpAuthProtocol: null,
      snmpAuthPassword: null,
      snmpPrivProtocol: null,
      snmpPrivPassword: null,
    };
  }

  const username = snmp.username ?? (existing.snmpVersion === 'V3' ? existing.snmpUsername : null);
  const authProtocol = snmp.authProtocol ?? (existing.snmpVersion === 'V3' ? existing.snmpAuthProtocol : null);
  const authPassword = snmp.authPassword ?? (existing.snmpVersion === 'V3' ? existing.snmpAuthPassword : null);
  const privProtocol = snmp.privProtocol === undefined ? (existing.snmpVersion === 'V3' ? existing.snmpPrivProtocol : null) : snmp.privProtocol;
  const privPassword = snmp.privPassword === undefined ? (existing.snmpVersion === 'V3' ? existing.snmpPrivPassword : null) : snmp.privPassword;

  if (!username || !authProtocol || !authPassword) {
    throw new ApiError(400, 'BAD_REQUEST', 'SNMP v3 username and authentication are required');
  }
  if ((privProtocol && !privPassword) || (!privProtocol && privPassword)) {
    throw new ApiError(400, 'BAD_REQUEST', 'SNMP v3 privacy protocol and password must be provided together');
  }

  return {
    snmpVersion: 'V3' as const,
    snmpPort: snmp.port ?? existing.snmpPort ?? 161,
    snmpCommunity: null,
    snmpUsername: username,
    snmpAuthProtocol: authProtocol,
    snmpAuthPassword: snmp.authPassword === undefined ? authPassword : encryptOptionalSecret(snmp.authPassword),
    snmpPrivProtocol: privProtocol,
    snmpPrivPassword: snmp.privPassword === undefined ? privPassword : encryptOptionalSecret(snmp.privPassword),
  };
}

async function resolveAllowedGroupIds(session: NonNullable<SessionUser>): Promise<string[]> {
  if (session.user.role === 'ADMIN') {
    return [];
  }
  return session.user.groupMemberships.map((membership) => membership.groupId);
}

async function mapGroupIds(deviceIds: string[]) {
  const rels = await prisma.deviceGroupDevice.findMany({
    where: { deviceId: { in: deviceIds } },
    select: { deviceId: true, deviceGroupId: true },
  });

  const map = new Map<string, string[]>();
  for (const rel of rels) {
    const existing = map.get(rel.deviceId) ?? [];
    existing.push(rel.deviceGroupId);
    map.set(rel.deviceId, existing);
  }
  return map;
}

async function mapDeviceGroups(deviceIds: string[]) {
  const rels = await prisma.deviceGroupDevice.findMany({
    where: { deviceId: { in: deviceIds } },
    select: {
      deviceId: true,
      deviceGroup: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const map = new Map<string, Array<{ id: string; name: string }>>();
  for (const rel of rels) {
    const existing = map.get(rel.deviceId) ?? [];
    existing.push(rel.deviceGroup);
    map.set(rel.deviceId, existing);
  }
  return map;
}

async function mapSites(deviceIds: string[]) {
  const devices = await prisma.device.findMany({
    where: { id: { in: deviceIds } },
    select: {
      id: true,
      site: true,
    },
  });

  return new Map<string, SiteDto | null>(
    devices.map((device) => [device.id, toSiteDto(device.site as DeviceSiteRecord | null)]),
  );
}

async function assertSiteExists(siteId: string | null | undefined) {
  if (!siteId) {
    return;
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true },
  });

  if (!site) {
    throw new ApiError(400, 'BAD_REQUEST', 'Selected site does not exist');
  }
}

export async function listDevices(session: NonNullable<SessionUser>, search?: string | null) {
  const userGroupIds = await resolveAllowedGroupIds(session);
  const normalizedSearch = search?.trim();

  let devices: DeviceView[] = [];

  if (normalizedSearch) {
    const searchPattern = `%${normalizedSearch}%`;
    if (session.user.role === 'ADMIN') {
      devices = await prisma.$queryRaw<
        DeviceView[]
      >(
        Prisma.sql`
          SELECT d."id", d."name", d."ip", d."vendor", d."type", d."zabbixHostId",
                 d."siteId",
                 d."snmpVersion"::text, d."snmpPort", d."snmpUsername",
                 d."snmpAuthProtocol"::text, d."snmpPrivProtocol"::text, d."snmpCommunity",
                 d."snmpAuthPassword", d."snmpPrivPassword", d."snmpStatus"::text,
                 d."snmpLastSyncAt", d."snmpLastError", d."snmpHostname", d."snmpSoftwareVersion",
                 d."snmpUptimeTicks", d."snmpInterfaces", d."icmpStatus"::text,
                 d."lastPingAt", d."lastPingDuration"
          FROM "Device" d
          WHERE unaccent(lower(d."name")) LIKE unaccent(lower(${searchPattern}))
             OR unaccent(lower(d."ip")) LIKE unaccent(lower(${searchPattern}))
             OR unaccent(lower(COALESCE(d."vendor", ''))) LIKE unaccent(lower(${searchPattern}))
             OR unaccent(lower(COALESCE(d."type", ''))) LIKE unaccent(lower(${searchPattern}))
             OR EXISTS (
               SELECT 1
               FROM "Site" s
               WHERE s."id" = d."siteId"
                 AND (
                   unaccent(lower(s."name")) LIKE unaccent(lower(${searchPattern}))
                   OR unaccent(lower(COALESCE(s."city", ''))) LIKE unaccent(lower(${searchPattern}))
                 )
             )
          ORDER BY d."name" ASC
        `,
      );
    } else if (userGroupIds.length > 0) {
      devices = await prisma.$queryRaw<
        DeviceView[]
      >(
        Prisma.sql`
          SELECT DISTINCT d."id", d."name", d."ip", d."vendor", d."type", d."zabbixHostId",
                 d."siteId",
                 d."snmpVersion"::text, d."snmpPort", d."snmpUsername",
                 d."snmpAuthProtocol"::text, d."snmpPrivProtocol"::text, d."snmpCommunity",
                 d."snmpAuthPassword", d."snmpPrivPassword", d."snmpStatus"::text,
                 d."snmpLastSyncAt", d."snmpLastError", d."snmpHostname", d."snmpSoftwareVersion",
                 d."snmpUptimeTicks", d."snmpInterfaces", d."icmpStatus"::text,
                 d."lastPingAt", d."lastPingDuration"
          FROM "Device" d
          JOIN "DeviceGroupDevice" dgd ON dgd."deviceId" = d."id"
          JOIN "GroupDeviceAccess" gda ON gda."deviceGroupId" = dgd."deviceGroupId"
          WHERE gda."groupId" IN (${Prisma.join(userGroupIds)})
            AND (
              unaccent(lower(d."name")) LIKE unaccent(lower(${searchPattern}))
              OR unaccent(lower(d."ip")) LIKE unaccent(lower(${searchPattern}))
              OR unaccent(lower(COALESCE(d."vendor", ''))) LIKE unaccent(lower(${searchPattern}))
              OR unaccent(lower(COALESCE(d."type", ''))) LIKE unaccent(lower(${searchPattern}))
              OR EXISTS (
                SELECT 1
                FROM "Site" s
                WHERE s."id" = d."siteId"
                  AND (
                    unaccent(lower(s."name")) LIKE unaccent(lower(${searchPattern}))
                    OR unaccent(lower(COALESCE(s."city", ''))) LIKE unaccent(lower(${searchPattern}))
                  )
              )
            )
          ORDER BY d."name" ASC
        `,
      );
    }
  } else {
    devices = await prisma.device.findMany({
      where:
        session.user.role === 'ADMIN'
          ? undefined
          : {
              groups: {
                some: {
                  deviceGroup: {
                    access: {
                      some: {
                        groupId: { in: userGroupIds },
                      },
                    },
                  },
                },
              },
            },
      select: {
        id: true,
        name: true,
        ip: true,
        vendor: true,
        type: true,
        siteId: true,
        zabbixHostId: true,
        snmpVersion: true,
        snmpPort: true,
        snmpUsername: true,
        snmpAuthProtocol: true,
        snmpPrivProtocol: true,
        snmpCommunity: true,
        snmpAuthPassword: true,
        snmpPrivPassword: true,
        snmpStatus: true,
        snmpLastSyncAt: true,
        snmpLastError: true,
        snmpHostname: true,
        snmpSoftwareVersion: true,
        snmpUptimeTicks: true,
        snmpInterfaces: true,
        icmpStatus: true,
        lastPingAt: true,
        lastPingDuration: true,
        site: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  const deviceIds = devices.map((device) => device.id);
  const groupMap = await mapGroupIds(deviceIds);
  const deviceGroupMap = await mapDeviceGroups(deviceIds);
  const siteMap = await mapSites(deviceIds);
  return devices.map((device) => toDeviceDto(device, groupMap.get(device.id) ?? [], deviceGroupMap.get(device.id) ?? [], siteMap.get(device.id) ?? null));
}

export async function canReadDevice(
  deviceId: string,
  session: NonNullable<SessionUser>,
): Promise<boolean> {
  if (session.user.role === 'ADMIN') {
    return true;
  }
  const userGroupIds = session.user.groupMemberships.map((membership) => membership.groupId);
  if (userGroupIds.length === 0) {
    return false;
  }
  const count = await prisma.deviceGroupDevice.count({
    where: {
      deviceId,
      deviceGroup: {
        access: {
          some: {
            groupId: { in: userGroupIds },
          },
        },
      },
    },
  });
  return count > 0;
}

export async function getDeviceById(deviceId: string, session: NonNullable<SessionUser>) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      site: true,
      groups: {
        select: {
          deviceGroupId: true,
          deviceGroup: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      metrics: {
        orderBy: { recordedAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!device) {
    throw new ApiError(404, 'NOT_FOUND', 'Device not found');
  }

  if (!(await canReadDevice(device.id, session))) {
    throw new ApiError(403, 'FORBIDDEN', 'Device access denied');
  }

  const icmpHistoryRows = await prisma.deviceMetric.findMany({
    where: {
      deviceId: device.id,
      source: 'icmp',
      itemKey: { in: ['icmp.status', 'icmp.rtt', 'icmp.packetLoss'] },
    },
    orderBy: { recordedAt: 'desc' },
    take: 2160,
  });

  const icmpHistoryMap = new Map<string, {
    recordedAt: string;
    status: 'UP' | 'DOWN';
    rttMs: number | null;
    packetLossPercent: number | null;
  }>();

  for (const metric of icmpHistoryRows) {
    const recordedAt = metric.recordedAt.toISOString();
    const existing = icmpHistoryMap.get(recordedAt) ?? {
      recordedAt,
      status: 'DOWN' as const,
      rttMs: null,
      packetLossPercent: null,
    };

    if (metric.itemKey === 'icmp.status') {
      existing.status = metric.valueText === 'UP' || metric.valueNumeric === 1 ? 'UP' : 'DOWN';
    }

    if (metric.itemKey === 'icmp.rtt') {
      existing.rttMs = metric.valueNumeric;
    }

    if (metric.itemKey === 'icmp.packetLoss') {
      existing.packetLossPercent = metric.valueNumeric;
    }

    icmpHistoryMap.set(recordedAt, existing);
  }

  const icmpHistory = [...icmpHistoryMap.values()]
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .slice(-720);

  const metrics = device.metrics.map((metric) => ({
    itemKey: metric.itemKey,
    itemName: metric.itemName,
    valueNumeric: metric.valueNumeric,
    valueText: metric.valueText,
    recordedAt: metric.recordedAt.toISOString(),
    metadata: metric.metadata,
  }));

  return {
    ...toDeviceDto(
      {
        id: device.id,
        name: device.name,
        ip: device.ip,
        vendor: device.vendor,
        type: device.type,
        siteId: device.siteId,
        zabbixHostId: device.zabbixHostId,
        snmpVersion: device.snmpVersion,
        snmpPort: device.snmpPort,
        snmpUsername: device.snmpUsername,
        snmpAuthProtocol: device.snmpAuthProtocol,
        snmpPrivProtocol: device.snmpPrivProtocol,
        snmpCommunity: device.snmpCommunity,
        snmpAuthPassword: device.snmpAuthPassword,
        snmpPrivPassword: device.snmpPrivPassword,
        snmpStatus: device.snmpStatus,
        snmpLastSyncAt: device.snmpLastSyncAt,
        snmpLastError: device.snmpLastError,
        snmpHostname: device.snmpHostname,
        snmpSoftwareVersion: device.snmpSoftwareVersion,
        snmpUptimeTicks: device.snmpUptimeTicks,
        snmpInterfaces: device.snmpInterfaces,
        icmpStatus: device.icmpStatus,
        lastPingAt: device.lastPingAt,
        lastPingDuration: device.lastPingDuration,
      },
      device.groups.map((item) => item.deviceGroupId),
      device.groups.map((item) => item.deviceGroup),
      toSiteDto(device.site as DeviceSiteRecord | null),
    ),
    metrics,
    icmpHistory,
  };
}

export async function createDevice(data: {
  name: string;
  ip: string;
  vendor?: string | null;
  type?: string | null;
  siteId?: string | null;
  zabbixHostId?: string | null;
  snmp?: DeviceSnmpInput | null;
  deviceGroupIds: string[];
}) {
  await assertSiteExists(data.siteId);

  const device = await prisma.device.create({
    data: {
      name: data.name,
      ip: data.ip,
      vendor: data.vendor,
      type: data.type,
      siteId: data.siteId,
      zabbixHostId: data.zabbixHostId,
      ...buildSnmpCreateData(data.snmp),
      groups: {
        create: data.deviceGroupIds.map((deviceGroupId) => ({
          deviceGroupId,
        })),
      },
    },
    include: { groups: true, site: true },
  });

  const deviceGroups = await prisma.deviceGroup.findMany({
    where: { id: { in: device.groups.map((item) => item.deviceGroupId) } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return toDeviceDto(device, device.groups.map((item) => item.deviceGroupId), deviceGroups, toSiteDto(device.site as DeviceSiteRecord | null));
}

export async function updateDevice(
  id: string,
  data: Partial<{
    name: string;
    ip: string;
    vendor?: string | null;
    type?: string | null;
    siteId?: string | null;
    zabbixHostId?: string | null;
    snmp?: DeviceSnmpInput | null;
    deviceGroupIds: string[];
  }>,
) {
  if (data.siteId !== undefined) {
    await assertSiteExists(data.siteId);
  }

  const existing = await prisma.device.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ip: true,
      vendor: true,
      type: true,
      siteId: true,
      zabbixHostId: true,
      snmpVersion: true,
      snmpPort: true,
      snmpUsername: true,
      snmpAuthProtocol: true,
      snmpPrivProtocol: true,
      snmpCommunity: true,
      snmpAuthPassword: true,
      snmpPrivPassword: true,
      snmpStatus: true,
      snmpLastSyncAt: true,
      snmpLastError: true,
      snmpHostname: true,
      snmpSoftwareVersion: true,
      snmpUptimeTicks: true,
      snmpInterfaces: true,
      icmpStatus: true,
      lastPingAt: true,
      lastPingDuration: true,
    },
  });

  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Device not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.device.update({
      where: { id },
      data: {
        name: data.name,
        ip: data.ip,
        vendor: data.vendor,
        type: data.type,
        siteId: data.siteId,
        zabbixHostId: data.zabbixHostId,
        ...resolveSnmpUpdateData(existing, data.snmp),
      },
    });

    if (data.deviceGroupIds) {
      await tx.deviceGroupDevice.deleteMany({
        where: { deviceId: id },
      });
      if (data.deviceGroupIds.length > 0) {
        await tx.deviceGroupDevice.createMany({
          data: data.deviceGroupIds.map((deviceGroupId) => ({
            deviceId: id,
            deviceGroupId,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  const updated = await prisma.device.findUnique({
    where: { id },
    include: { groups: true, site: true },
  });

  if (!updated) {
    throw new ApiError(404, 'NOT_FOUND', 'Device not found');
  }

  const deviceGroups = await prisma.deviceGroup.findMany({
    where: { id: { in: updated.groups.map((item) => item.deviceGroupId) } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return toDeviceDto(updated, updated.groups.map((item) => item.deviceGroupId), deviceGroups, toSiteDto(updated.site as DeviceSiteRecord | null));
}

export async function deleteDevice(id: string) {
  await prisma.device.delete({ where: { id } });
  return { ok: true };
}
