import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { SearchableSelectComponent, type SearchableSelectOption } from '../../core/layout/searchable-select.component';
import { normalizeSearchText } from '../../core/utils/search.util';
import type { DeviceDto } from '@nms/shared';

interface DeviceGroupOption extends SearchableSelectOption {}

@Component({
  selector: 'app-host-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
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
        <label>Vendor</label>
        <app-searchable-select
          [(ngModel)]="form.vendor"
          [ngModelOptions]="{ standalone: true }"
          [options]="vendors()"
          placeholder="Select vendor"
          metaText="Catalog search without diacritics"
          searchPlaceholder="Search vendor"
          emptyOptionLabel="No vendor"
          emptyStateLabel="No matching vendors"
        />
      </div>

      <div class="form-group">
        <label>Device Type</label>
        <app-searchable-select
          [(ngModel)]="form.type"
          [ngModelOptions]="{ standalone: true }"
          [options]="deviceTypes()"
          placeholder="Select device type"
          metaText="Filter available types instantly"
          searchPlaceholder="Search device type"
          emptyOptionLabel="No device type"
          emptyStateLabel="No matching device types"
        />
      </div>

      <div class="form-group">
        <label for="zabbixHostId">Zabbix Host ID (optional)</label>
        <input id="zabbixHostId" type="text" [(ngModel)]="form.zabbixHostId" name="zabbixHostId" placeholder="Leave empty for manual host" />
      </div>

      <div class="form-group" *ngIf="deviceGroups().length > 0">
        <label>Device Groups</label>
        <app-searchable-select
          [(ngModel)]="form.deviceGroupIds"
          [ngModelOptions]="{ standalone: true }"
          [options]="deviceGroups()"
          [multiple]="true"
          placeholder="Select device groups"
          metaText="Multi-select with fulltext search"
          searchPlaceholder="Search device groups"
          emptyOptionLabel="No device groups"
          emptyStateLabel="No matching device groups"
        />
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

      .form-error {
        padding: 10px 14px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 10px;
        color: #dc2626;
      }
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
  protected readonly vendors = signal<SearchableSelectOption[]>([]);
  protected readonly deviceTypes = signal<SearchableSelectOption[]>([]);
  protected readonly deviceGroups = signal<DeviceGroupOption[]>([]);

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

    this.api.getVendors().subscribe({
      next: (res) => {
        const options = this.toCatalogOptions(res.data as Array<{ id: string; name: string }>);
        this.vendors.set(this.withCurrentSelection(options, this.form.vendor));
      },
    });

    this.api.getDeviceTypes().subscribe({
      next: (res) => {
        const options = this.toCatalogOptions(res.data as Array<{ id: string; name: string }>);
        this.deviceTypes.set(this.withCurrentSelection(options, this.form.type));
      },
    });

    this.api.getDeviceGroups().subscribe({
      next: (res) => {
        const groups = (res.data as Array<{ id: string; name: string; description?: string | null }>).map((group) => ({
          value: group.id,
          label: group.name,
          description: group.description ?? null,
        }));
        this.deviceGroups.set(this.sortByLabel(groups));
      },
    });
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

  private toCatalogOptions(items: Array<{ id: string; name: string }>): SearchableSelectOption[] {
    return this.sortByLabel(items.map((item) => ({ value: item.name, label: item.name })));
  }

  private withCurrentSelection(options: SearchableSelectOption[], currentValue: string): SearchableSelectOption[] {
    const value = currentValue.trim();
    if (!value) return options;

    const exists = options.some((option) => normalizeSearchText(option.label) === normalizeSearchText(value));
    if (exists) return options;

    return this.sortByLabel([{ value, label: value }, ...options]);
  }

  private sortByLabel<T extends { label: string }>(items: T[]): T[] {
    return [...items].sort((left, right) => left.label.localeCompare(right.label, 'sk', { sensitivity: 'base' }));
  }
}
