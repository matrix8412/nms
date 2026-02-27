import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import type { DeviceDto } from '@nms/shared';

@Component({
  selector: 'app-host-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form (ngSubmit)="onSubmit()" class="form">
      <div class="form-group">
        <label for="name">Host Name *</label>
        <input id="name" type="text" [(ngModel)]="form.name" name="name" required minlength="2" placeholder="e.g. Core Switch 01" />
      </div>

      <div class="form-group">
        <label for="ip">IP Address *</label>
        <input id="ip" type="text" [(ngModel)]="form.ip" name="ip" required placeholder="e.g. 192.168.1.1" />
      </div>

      <div class="form-group">
        <label for="vendor">Vendor</label>
        <input id="vendor" type="text" [(ngModel)]="form.vendor" name="vendor" placeholder="e.g. Cisco, Mikrotik" />
      </div>

      <div class="form-group">
        <label for="type">Type</label>
        <input id="type" type="text" [(ngModel)]="form.type" name="type" placeholder="e.g. Switch, Router, AP" />
      </div>

      <div class="form-group">
        <label for="zabbixHostId">Zabbix Host ID (optional)</label>
        <input id="zabbixHostId" type="text" [(ngModel)]="form.zabbixHostId" name="zabbixHostId" placeholder="Leave empty for manual host" />
      </div>

      <div class="form-group" *ngIf="deviceGroups().length > 0">
        <label>Device Groups</label>
        <div class="checkbox-list">
          <label *ngFor="let group of deviceGroups()" class="checkbox-item">
            <input
              type="checkbox"
              [checked]="form.deviceGroupIds.includes(group.id)"
              (change)="toggleGroup(group.id)"
            />
            <span>{{ group.name }}</span>
          </label>
        </div>
      </div>

      <div class="form-error" *ngIf="error()">{{ error() }}</div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" (click)="cancelled.emit()">Cancel</button>
        <button type="submit" class="btn btn-primary" [disabled]="submitting()">
          {{ submitting() ? 'Saving...' : (host ? 'Update Host' : 'Create Host') }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .form {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .form-group label {
        font-size: 0.82rem;
        font-weight: 600;
        color: #475569;
      }
      .form-group input[type="text"] {
        padding: 10px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.88rem;
        font-family: inherit;
        transition: border-color 0.15s;
        outline: none;
      }
      .form-group input[type="text"]:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      }

      .checkbox-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 160px;
        overflow-y: auto;
        padding: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.86rem;
        color: #334155;
        cursor: pointer;
      }
      .checkbox-item input[type="checkbox"] {
        accent-color: #3b82f6;
      }

      .form-error {
        padding: 10px 14px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 10px;
        color: #dc2626;
        font-size: 0.86rem;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        padding-top: 8px;
        border-top: 1px solid #f1f5f9;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.88rem;
        cursor: pointer;
        transition: background 0.15s;
        font-family: inherit;
      }
      .btn-primary { background: #3b82f6; color: #fff; }
      .btn-primary:hover { background: #2563eb; }
      .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      .btn-secondary { background: #e2e8f0; color: #475569; }
      .btn-secondary:hover { background: #cbd5e1; }
    `,
  ],
})
export class HostFormComponent implements OnInit {
  private readonly api = inject(ApiService);

  @Input() host: DeviceDto | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly deviceGroups = signal<{ id: string; name: string }[]>([]);

  protected form = {
    name: '',
    ip: '',
    vendor: '',
    type: '',
    zabbixHostId: '',
    deviceGroupIds: [] as string[],
  };

  ngOnInit() {
    if (this.host) {
      this.form = {
        name: this.host.name,
        ip: this.host.ip,
        vendor: this.host.vendor ?? '',
        type: this.host.type ?? '',
        zabbixHostId: this.host.zabbixHostId ?? '',
        deviceGroupIds: [...(this.host.groupIds ?? [])],
      };
    }

    this.api.getDeviceGroups().subscribe({
      next: (res) => {
        const groups = (res.data as Array<{ id: string; name: string }>);
        this.deviceGroups.set(groups);
      },
    });
  }

  protected toggleGroup(id: string) {
    const idx = this.form.deviceGroupIds.indexOf(id);
    if (idx >= 0) {
      this.form.deviceGroupIds.splice(idx, 1);
    } else {
      this.form.deviceGroupIds.push(id);
    }
  }

  protected onSubmit() {
    this.error.set('');
    this.submitting.set(true);

    const payload = {
      name: this.form.name.trim(),
      ip: this.form.ip.trim(),
      vendor: this.form.vendor.trim() || null,
      type: this.form.type.trim() || null,
      zabbixHostId: this.form.zabbixHostId.trim() || null,
      deviceGroupIds: this.form.deviceGroupIds,
    };

    const obs = this.host
      ? this.api.updateDevice(this.host.id, payload)
      : this.api.createDevice(payload);

    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message || 'An error occurred');
      },
    });
  }
}
