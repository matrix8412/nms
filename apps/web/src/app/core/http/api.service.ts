import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { DeviceDto, GroupDto } from '@nms/shared';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getDevices(query = '') {
    const params = query ? { q: query } : undefined;
    return this.http.get<{ data: DeviceDto[] }>('/api/devices', { params });
  }

  getDevice(deviceId: string) {
    return this.http.get<{ data: DeviceDto & { metrics: unknown[] } }>(`/api/devices/${deviceId}`);
  }

  getGroups() {
    return this.http.get<{ data: GroupDto[] }>('/api/groups');
  }

  getDeviceGroups() {
    return this.http.get<{ data: unknown[] }>('/api/device-groups');
  }

  getAdminUsers() {
    return this.http.get<{ data: unknown[] }>('/api/admin/users');
  }

  triggerZabbixSync(deviceIds?: string[]) {
    return this.http.post<{ ok: boolean; enqueued: number }>('/api/zabbix/sync', {
      deviceIds,
      force: true,
    });
  }
}
