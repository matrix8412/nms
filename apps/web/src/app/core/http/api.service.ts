import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { DeviceDto, GroupDto, SiteDto } from '@nms/shared';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ── Devices / Hosts ──────────────────────────────────────
  getDevices(query = '') {
    const params = query ? { q: query } : undefined;
    return this.http.get<{ data: DeviceDto[] }>('/api/devices', { params });
  }

  getDevice(deviceId: string) {
    return this.http.get<{ data: DeviceDto & {
      metrics: unknown[];
      icmpHistory?: Array<{
        recordedAt: string;
        status: 'UP' | 'DOWN';
        rttMs: number | null;
        packetLossPercent: number | null;
      }>;
    } }>(`/api/devices/${deviceId}`);
  }

  createDevice(payload: {
    name: string;
    ip: string;
    vendor?: string | null;
    type?: string | null;
    siteId?: string | null;
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
      siteId?: string | null;
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
  exportDeviceGroupsCsv() {
    return this.http.get('/api/device-groups/csv', { responseType: 'text' });
  }
  importDeviceGroupsCsv(csv: string) {
    return this.http.post<{ ok: boolean }>('/api/device-groups/csv', { csv });
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
    return this.http.get<{ data: Array<{ id: string; name: string; logoDataUrl?: string | null; createdAt: string }> }>('/api/catalog/vendors');
  }
  exportVendorsCsv() {
    return this.http.get('/api/catalog/vendors/csv', { responseType: 'text' });
  }
  importVendorsCsv(csv: string) {
    return this.http.post<{ ok: boolean }>('/api/catalog/vendors/csv', { csv });
  }

  createVendor(payload: { name: string; logoDataUrl?: string | null }) {
    return this.http.post<{ data: unknown }>('/api/catalog/vendors', payload);
  }

  updateVendor(id: string, payload: { name: string; logoDataUrl?: string | null }) {
    return this.http.patch<{ data: unknown }>(`/api/catalog/vendors/${id}`, payload);
  }

  deleteVendor(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/catalog/vendors/${id}`);
  }

  // ── Device Types (Catalog) ───────────────────────────────
  getSites() {
    return this.http.get<{ data: SiteDto[] }>('/api/catalog/sites');
  }
  exportSitesCsv() {
    return this.http.get('/api/catalog/sites/csv', { responseType: 'text' });
  }
  importSitesCsv(csv: string) {
    return this.http.post<{ ok: boolean }>('/api/catalog/sites/csv', { csv });
  }

  createSite(payload: {
    name: string;
    street: string;
    descriptiveNumber: string;
    orientationNumber?: string | null;
    zipNumber: string;
    city: string;
    latitude: number;
    longitude: number;
    description?: string | null;
  }) {
    return this.http.post<{ data: SiteDto }>('/api/catalog/sites', payload);
  }

  updateSite(id: string, payload: {
    name: string;
    street: string;
    descriptiveNumber: string;
    orientationNumber?: string | null;
    zipNumber: string;
    city: string;
    latitude: number;
    longitude: number;
    description?: string | null;
  }) {
    return this.http.patch<{ data: SiteDto }>(`/api/catalog/sites/${id}`, payload);
  }

  deleteSite(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/catalog/sites/${id}`);
  }

  getDeviceTypes() {
    return this.http.get<{ data: Array<{ id: string; name: string; vendor?: string | null; photoDataUrl?: string | null; createdAt: string }> }>('/api/catalog/device-types');
  }
  exportDeviceTypesCsv() {
    return this.http.get('/api/catalog/device-types/csv', { responseType: 'text' });
  }
  importDeviceTypesCsv(csv: string) {
    return this.http.post<{ ok: boolean }>('/api/catalog/device-types/csv', { csv });
  }

  createDeviceType(payload: { name: string; vendor?: string | null; photoDataUrl?: string | null }) {
    return this.http.post<{ data: unknown }>('/api/catalog/device-types', payload);
  }

  updateDeviceType(id: string, payload: { name: string; vendor?: string | null; photoDataUrl?: string | null }) {
    return this.http.patch<{ data: unknown }>(`/api/catalog/device-types/${id}`, payload);
  }

  deleteDeviceType(id: string) {
    return this.http.delete<{ ok: boolean }>(`/api/catalog/device-types/${id}`);
  }

  getSnmpTemplates() {
    return this.http.get<{ data: unknown[] }>('/api/catalog/snmp-templates');
  }
  exportSnmpTemplatesCsv() {
    return this.http.get('/api/catalog/snmp-templates/csv', { responseType: 'text' });
  }
  importSnmpTemplatesCsv(csv: string) {
    return this.http.post<{ ok: boolean }>('/api/catalog/snmp-templates/csv', { csv });
  }

  createSnmpTemplate(payload: {
    vendor?: string | null;
    deviceType?: string | null;
    metricKey: string;
    oid: string;
    intervalSec: number;
    enabled: boolean;
  }) {
    return this.http.post<{ data: unknown }>('/api/catalog/snmp-templates', payload);
  }

  updateSnmpTemplate(id: string, payload: {
    vendor?: string | null;
    deviceType?: string | null;
    metricKey: string;
    oid: string;
    intervalSec: number;
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

  testIntegrationConnection(provider: string) {
    return this.http.post<{ ok: boolean; provider: string; version?: string; tokenValidated?: boolean }>(`/api/integrations/${provider}/test`, {});
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

  getZabbixTemplates() {
    return this.http.get<{ data: Array<{ id: string; host: string; name: string }> }>('/api/zabbix/templates');
  }

  mapZabbixTemplate(payload: {
    templateId: string;
    vendor?: string | null;
    deviceType?: string | null;
    replace?: boolean;
  }) {
    return this.http.post<{ ok: boolean; imported: number; totalItems: number }>('/api/zabbix/templates/map', payload);
  }
}
