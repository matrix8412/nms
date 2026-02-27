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

  getDeviceGroups() {
    return this.http.get<{ data: unknown[] }>('/api/device-groups');
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

  // ── Zabbix ───────────────────────────────────────────────
  triggerZabbixSync(deviceIds?: string[]) {
    return this.http.post<{ ok: boolean; enqueued: number }>('/api/zabbix/sync', {
      deviceIds,
      force: true,
    });
  }
}
