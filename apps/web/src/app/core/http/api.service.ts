import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { DeviceDto, GroupDto } from '@nms/shared';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ── Devices / Hosts ──────────────────────────────────────
  getDevices(query = '') {
    const params = query ? { q: query } : undefined;
    return this.http.get<{ data: DeviceDto[] }>('/api/devices', { params });
  }

  getDevice(deviceId: string) {
    return this.http.get<{ data: DeviceDto & { metrics: unknown[] } }>(`/api/devices/${deviceId}`);
  }

  createDevice(payload: {
    name: string;
    ip: string;
    vendor?: string | null;
    type?: string | null;
    zabbixHostId?: string | null;
    snmp?: {
      version: 'V2C' | 'V3';
      port?: number;
      community?: string | null;
      username?: string | null;
      authProtocol?: 'MD5' | 'SHA' | null;
      authPassword?: string | null;
      privProtocol?: 'DES' | 'AES' | null;
      privPassword?: string | null;
    } | null;
    deviceGroupIds?: string[];
  }) {
    return this.http.post<{ data: DeviceDto }>('/api/devices', payload);
  }

  updateDevice(
    deviceId: string,
    payload: {
      name?: string;
      ip?: string;
      vendor?: string | null;
      type?: string | null;
      zabbixHostId?: string | null;
      snmp?: {
        version: 'V2C' | 'V3';
        port?: number;
        community?: string | null;
        username?: string | null;
        authProtocol?: 'MD5' | 'SHA' | null;
        authPassword?: string | null;
        privProtocol?: 'DES' | 'AES' | null;
        privPassword?: string | null;
      } | null;
      deviceGroupIds?: string[];
    },
  ) {
    return this.http.patch<{ data: DeviceDto }>(`/api/devices/${deviceId}`, payload);
  }

  deleteDevice(deviceId: string) {
    return this.http.delete<{ ok: boolean }>(`/api/devices/${deviceId}`);
  }

  // ── Groups ───────────────────────────────────────────────
  getGroups() {
    return this.http.get<{ data: GroupDto[] }>('/api/groups');
  }

  // ── Device Groups (Host Groups) ──────────────────────────
  getDeviceGroups() {
    return this.http.get<{ data: unknown[] }>('/api/device-groups');
  }

  createDeviceGroup(payload: { name: string; description?: string | null }) {
    return this.http.post<{ data: unknown }>('/api/device-groups', payload);
  }

  updateDeviceGroup(id: string, payload: { name?: string; description?: string | null }) {
    return this.http.patch<{ data: unknown }>(`/api/device-groups/${id}`, payload);
  }

  deleteDeviceGroup(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/device-groups/${id}`);
  }

  // ── Admin Users ──────────────────────────────────────────
  getAdminUsers() {
    return this.http.get<{ data: unknown[] }>('/api/admin/users');
  }

  updateAdminUser(userId: string, payload: { role?: 'USER' | 'ADMIN'; groupIds?: string[] }) {
    return this.http.patch<{ data: unknown }>(`/api/admin/users/${userId}`, payload);
  }

  // ── Audit Logs ───────────────────────────────────────────
  getAuditLogs(page = 1, limit = 25) {
    return this.http.get<{
      data: Array<{
        id: string;
        action: string;
        userEmail: string | null;
        ip: string | null;
        userAgent: string | null;
        createdAt: string;
        meta: unknown;
      }>;
      total: number;
      page: number;
      totalPages: number;
    }>('/api/audit-logs', { params: { page: page.toString(), limit: limit.toString() } });
  }

  // ── Vendors (Catalog) ────────────────────────────────────
  getVendors() {
    return this.http.get<{ data: unknown[] }>('/api/catalog/vendors');
  }

  createVendor(payload: { name: string }) {
    return this.http.post<{ data: unknown }>('/api/catalog/vendors', payload);
  }

  updateVendor(id: string, payload: { name: string }) {
    return this.http.patch<{ data: unknown }>(`/api/catalog/vendors/${id}`, payload);
  }

  deleteVendor(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/catalog/vendors/${id}`);
  }

  // ── Device Types (Catalog) ───────────────────────────────
  getDeviceTypes() {
    return this.http.get<{ data: Array<{ id: string; name: string; vendor?: string | null; createdAt: string }> }>('/api/catalog/device-types');
  }

  createDeviceType(payload: { name: string; vendor?: string | null }) {
    return this.http.post<{ data: unknown }>('/api/catalog/device-types', payload);
  }

  updateDeviceType(id: string, payload: { name: string; vendor?: string | null }) {
    return this.http.patch<{ data: unknown }>(`/api/catalog/device-types/${id}`, payload);
  }

  deleteDeviceType(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/catalog/device-types/${id}`);
  }

  getSnmpTemplates() {
    return this.http.get<{ data: unknown[] }>('/api/catalog/snmp-templates');
  }

  createSnmpTemplate(payload: {
    vendor?: string | null;
    deviceType?: string | null;
    metricKey: 'hostname' | 'softwareVersion' | 'uptime' | 'ifOperStatus' | 'ifName' | 'ifDescription' | 'ifMac';
    oid: string;
    enabled: boolean;
  }) {
    return this.http.post<{ data: unknown }>('/api/catalog/snmp-templates', payload);
  }

  updateSnmpTemplate(id: string, payload: {
    vendor?: string | null;
    deviceType?: string | null;
    metricKey: 'hostname' | 'softwareVersion' | 'uptime' | 'ifOperStatus' | 'ifName' | 'ifDescription' | 'ifMac';
    oid: string;
    enabled: boolean;
  }) {
    return this.http.patch<{ data: unknown }>(`/api/catalog/snmp-templates/${id}`, payload);
  }

  deleteSnmpTemplate(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/catalog/snmp-templates/${id}`);
  }

  // ── Integrations ─────────────────────────────────────────
  getIntegrations() {
    return this.http.get<{ data: unknown[] }>('/api/integrations');
  }

  getIntegration(provider: string) {
    return this.http.get<{ data: unknown }>(`/api/integrations/${provider}`);
  }

  updateIntegration(provider: string, payload: { enabled?: boolean; settings?: Record<string, unknown> }) {
    return this.http.put<{ data: unknown }>(`/api/integrations/${provider}`, payload);
  }

  // ── Roles ────────────────────────────────────────────────
  getRoles() {
    return this.http.get<{ data: unknown[] }>('/api/roles');
  }

  createRole(payload: { name: string; description?: string | null; permissions: { resource: string; action: string }[] }) {
    return this.http.post<{ data: unknown }>('/api/roles', payload);
  }

  updateRole(id: string, payload: { name?: string; description?: string | null; permissions?: { resource: string; action: string }[] }) {
    return this.http.patch<{ data: unknown }>(`/api/roles/${id}`, payload);
  }

  deleteRole(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/roles/${id}`);
  }

  // ── Zabbix ───────────────────────────────────────────────
  triggerZabbixSync(deviceIds?: string[]) {
    return this.http.post<{ ok: boolean; enqueued: number }>('/api/zabbix/sync', {
      deviceIds,
      force: true,
    });
  }
}
