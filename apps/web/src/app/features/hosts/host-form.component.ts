import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { SearchableSelectComponent, type SearchableSelectOption } from '../../core/layout/searchable-select.component';
import { normalizeSearchText } from '../../core/utils/search.util';
import type { DeviceDto, DeviceTagDto } from '@nms/shared';

interface DeviceGroupOption extends SearchableSelectOption {}
interface DeviceTypeCatalogItem {
  id: string;
  name: string;
  vendor?: string | null;
}
interface SiteOption extends SearchableSelectOption {}

@Component({
  selector: 'app-host-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  template: `
    <form (ngSubmit)="onSubmit()" class="form">
      <div class="form-tabs">
        <button type="button" class="tab-btn" [class.active]="activeTab() === 'general'" (click)="activeTab.set('general')">General</button>
        <button type="button" class="tab-btn" [class.active]="activeTab() === 'snmp'" (click)="activeTab.set('snmp')">SNMP</button>
      </div>

      <ng-container *ngIf="activeTab() === 'general'">
        <div class="form-group">
          <label for="description">Description *</label>
          <input id="description" type="text" [(ngModel)]="form.description" name="description" required minlength="2" placeholder="e.g. Core switch in rack A" />
        </div>

        <div class="form-group">
          <label for="ip">IP/Hostname *</label>
          <input id="ip" type="text" [(ngModel)]="form.ip" name="ip" required placeholder="e.g. 192.168.1.1 or core-switch.example.com" />
        </div>

        <div class="form-group">
          <label>Vendor</label>
          <app-searchable-select
            [(ngModel)]="form.vendor"
            (ngModelChange)="onVendorChange()"
            [ngModelOptions]="{ standalone: true }"
            [options]="vendors()"
            [compact]="true"
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
            [compact]="true"
            placeholder="Select device type"
            metaText="Filter available types instantly"
            searchPlaceholder="Search device type"
            emptyOptionLabel="No device type"
            emptyStateLabel="No matching device types"
          />
        </div>

        <div class="form-group">
          <label>Site</label>
          <app-searchable-select
            [(ngModel)]="form.siteId"
            [ngModelOptions]="{ standalone: true }"
            [options]="sites()"
            [compact]="true"
            placeholder="Select site"
            metaText="Assign one physical site to the host"
            searchPlaceholder="Search site"
            emptyOptionLabel="No site"
            emptyStateLabel="No matching sites"
          />
        </div>

        <div class="form-group">
          <label>Tags</label>
          <div class="tag-editor">
            <div class="tag-list" *ngIf="form.tags.length > 0">
              <span
                class="tag-chip"
                *ngFor="let tag of form.tags; let index = index"
                [style.background-color]="tag.color"
                [style.color]="tagTextColor(tag.color)"
              >
                <span>{{ tag.name }}</span>
                <button type="button" class="tag-remove" title="Remove tag" (click)="removeTag(index)">
                  <span class="material-icons">close</span>
                </button>
              </span>
            </div>

            <div class="tag-controls">
              <input
                class="tag-name-input"
                type="text"
                [(ngModel)]="newTagName"
                name="newTagName"
                maxlength="40"
                placeholder="Tag name"
                (keydown.enter)="addTag(); $event.preventDefault()"
              />
              <input class="tag-color-input" type="color" [(ngModel)]="newTagColor" name="newTagColor" title="Tag color" />
              <button type="button" class="tag-add" title="Add tag" (click)="addTag()" [disabled]="!newTagName.trim() || form.tags.length >= 12">
                <span class="material-icons">add</span>
              </button>
            </div>

            <div class="tag-swatches">
              <button
                type="button"
                class="tag-swatch"
                *ngFor="let color of tagPalette"
                [class.active]="newTagColor === color"
                [style.background-color]="color"
                [title]="color"
                (click)="selectTagColor(color)"
              ></button>
            </div>
          </div>
        </div>

        <div class="form-group" *ngIf="deviceGroups().length > 0">
          <label>Device Groups</label>
          <app-searchable-select
            [(ngModel)]="form.deviceGroupIds"
            [ngModelOptions]="{ standalone: true }"
            [options]="deviceGroups()"
            [multiple]="true"
            [compact]="true"
            placeholder="Select device groups"
            metaText="Multi-select with fulltext search"
            searchPlaceholder="Search device groups"
            emptyOptionLabel="No device groups"
            emptyStateLabel="No matching device groups"
          />
        </div>
      </ng-container>

      <div class="form-section" *ngIf="activeTab() === 'snmp'">
        <div class="section-heading">
          <span>SNMP Monitoring</span>
          <small>Optional direct polling for host data and interfaces</small>
          <small class="field-note" *ngIf="host">Older stored SNMP secrets are re-encrypted automatically the next time you save this host.</small>
        </div>

        <div class="form-group">
          <label for="snmpVersion">SNMP Version</label>
          <select id="snmpVersion" [(ngModel)]="form.snmpVersion" name="snmpVersion" (ngModelChange)="onSnmpVersionChange()">
            <option value="">Disabled</option>
            <option value="V2C">SNMP v2c</option>
            <option value="V3">SNMP v3</option>
          </select>
        </div>

        <div class="form-grid" *ngIf="form.snmpVersion">
          <div class="form-group">
            <label for="snmpPort">SNMP Port</label>
            <input id="snmpPort" type="number" [(ngModel)]="form.snmpPort" name="snmpPort" min="1" max="65535" />
          </div>

          <div class="form-group" *ngIf="form.snmpVersion === 'V2C'">
            <label for="snmpCommunity">Community</label>
            <input id="snmpCommunity" type="text" [(ngModel)]="form.snmpCommunity" name="snmpCommunity" placeholder="e.g. public" />
            <small class="field-hint" *ngIf="host?.snmp?.hasCommunity">Leave empty to keep the stored community.</small>
          </div>

          <ng-container *ngIf="form.snmpVersion === 'V3'">
            <div class="form-group">
              <label for="snmpUsername">Username</label>
              <input id="snmpUsername" type="text" [(ngModel)]="form.snmpUsername" name="snmpUsername" placeholder="SNMP v3 username" />
            </div>

            <div class="form-group">
              <label for="snmpAuthProtocol">Auth Protocol</label>
              <select id="snmpAuthProtocol" [(ngModel)]="form.snmpAuthProtocol" name="snmpAuthProtocol">
                <option value="">Select protocol</option>
                <option value="MD5">MD5</option>
                <option value="SHA">SHA</option>
              </select>
            </div>

            <div class="form-group">
              <label for="snmpAuthPassword">Auth Password</label>
              <input id="snmpAuthPassword" type="text" [(ngModel)]="form.snmpAuthPassword" name="snmpAuthPassword" placeholder="SNMP v3 auth password" />
              <small class="field-hint" *ngIf="host?.snmp?.hasAuthPassword">Leave empty to keep the stored auth password.</small>
            </div>

            <div class="form-group">
              <label for="snmpPrivProtocol">Privacy Protocol</label>
              <select id="snmpPrivProtocol" [(ngModel)]="form.snmpPrivProtocol" name="snmpPrivProtocol">
                <option value="">No privacy</option>
                <option value="DES">DES</option>
                <option value="AES">AES</option>
              </select>
            </div>

            <div class="form-group">
              <label for="snmpPrivPassword">Privacy Password</label>
              <input id="snmpPrivPassword" type="text" [(ngModel)]="form.snmpPrivPassword" name="snmpPrivPassword" placeholder="Required when privacy protocol is set" />
              <small class="field-hint" *ngIf="host?.snmp?.hasPrivPassword">Leave empty to keep the stored privacy password.</small>
            </div>
          </ng-container>
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
      .form-tabs {
        display: inline-flex;
        gap: 6px;
        padding: 4px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
      }
      .tab-btn {
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.82rem;
        font-weight: 700;
        color: #64748b;
        background: transparent;
        cursor: pointer;
      }
      .tab-btn.active {
        background: #ffffff;
        color: #1e293b;
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
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
      .form-group input[type="text"],
      .form-group input[type="number"],
      .form-group select {
        padding: 10px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.88rem;
        font-family: inherit;
        background: #fff;
        transition: border-color 0.15s;
        outline: none;
      }
      .form-group select {
        padding: 8px 12px;
        min-height: 38px;
        font-size: 0.84rem;
      }
      .form-group input[type="text"]:focus,
      .form-group input[type="number"]:focus,
      .form-group select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      }
      .tag-editor {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .tag-list,
      .tag-swatches {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .tag-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 26px;
        padding: 3px 8px 3px 10px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
      }
      .tag-remove {
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 999px;
        background: rgba(255,255,255,0.24);
        color: inherit;
        cursor: pointer;
        padding: 0;
      }
      .tag-remove .material-icons {
        font-size: 14px;
      }
      .tag-controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 42px 42px;
        gap: 8px;
        align-items: center;
      }
      .tag-name-input {
        width: 100%;
        min-width: 0;
      }
      .tag-color-input {
        width: 42px;
        height: 38px;
        padding: 3px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
      }
      .tag-add {
        width: 42px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 10px;
        background: #3b82f6;
        color: #fff;
        cursor: pointer;
      }
      .tag-add:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .tag-add .material-icons {
        font-size: 20px;
      }
      .tag-swatch {
        width: 22px;
        height: 22px;
        border: 2px solid #fff;
        border-radius: 999px;
        box-shadow: 0 0 0 1px #cbd5e1;
        cursor: pointer;
      }
      .tag-swatch.active {
        box-shadow: 0 0 0 2px #1e293b;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #f8fafc;
      }
      .section-heading {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .section-heading span {
        font-size: 0.9rem;
        font-weight: 700;
        color: #1e293b;
      }
      .section-heading small,
      .field-hint {
        color: #64748b;
        font-size: 0.78rem;
      }
      .field-note {
        color: #1d4ed8;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      @media (max-width: 720px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }

      .form-error {
        padding: 10px 14px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 10px;
        color: #dc2626;
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
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.88rem;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s, opacity 0.15s;
      }
      .btn-primary {
        background: #3b82f6;
        color: #fff;
      }
      .btn-primary:hover:not(:disabled) {
        background: #2563eb;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: #e2e8f0;
        color: #475569;
      }
      .btn-secondary:hover {
        background: #cbd5e1;
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
  private readonly allDeviceTypes = signal<DeviceTypeCatalogItem[]>([]);
  protected readonly sites = signal<SiteOption[]>([]);
  protected readonly deviceGroups = signal<DeviceGroupOption[]>([]);
  protected readonly activeTab = signal<'general' | 'snmp'>('general');
  protected readonly tagPalette = ['#2563EB', '#16A34A', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#475569'];
  protected newTagName = '';
  protected newTagColor = '#2563EB';

  protected form = {
    description: '',
    ip: '',
    tags: [] as DeviceTagDto[],
    vendor: '',
    type: '',
    siteId: '',
    snmpVersion: '',
    snmpPort: 161,
    snmpCommunity: '',
    snmpUsername: '',
    snmpAuthProtocol: '',
    snmpAuthPassword: '',
    snmpPrivProtocol: '',
    snmpPrivPassword: '',
    deviceGroupIds: [] as string[],
  };

  ngOnInit() {
    if (this.host) {
      this.form = {
        description: this.host.description,
        ip: this.host.ip,
        tags: [...(this.host.tags ?? [])],
        vendor: this.host.vendor ?? '',
        type: this.host.type ?? '',
        siteId: this.host.siteId ?? '',
        snmpVersion: this.host.snmp?.version ?? '',
        snmpPort: this.host.snmp?.port ?? 161,
        snmpCommunity: '',
        snmpUsername: this.host.snmp?.username ?? '',
        snmpAuthProtocol: this.host.snmp?.authProtocol ?? '',
        snmpAuthPassword: '',
        snmpPrivProtocol: this.host.snmp?.privProtocol ?? '',
        snmpPrivPassword: '',
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
        this.allDeviceTypes.set(res.data as DeviceTypeCatalogItem[]);
        this.refreshDeviceTypes();
      },
    });

    this.api.getSites().subscribe({
      next: (res) => {
        const options = this.sortByLabel(
          res.data.map((site) => ({
            value: site.id,
            label: site.name,
            description: `${site.street} ${site.descriptiveNumber}${site.orientationNumber ? '/' + site.orientationNumber : ''}, ${site.zipNumber} ${site.city}`,
          })),
        );
        this.sites.set(options);
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

    const snmp = this.buildSnmpPayload();

    const payload = {
      description: this.form.description.trim(),
      ip: this.form.ip.trim(),
      tags: this.form.tags,
      vendor: this.form.vendor.trim() || null,
      type: this.form.type.trim() || null,
      siteId: this.form.siteId || null,
      snmp,
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

  protected onSnmpVersionChange() {
    if (this.form.snmpVersion === 'V2C') {
      this.form.snmpUsername = '';
      this.form.snmpAuthProtocol = '';
      this.form.snmpAuthPassword = '';
      this.form.snmpPrivProtocol = '';
      this.form.snmpPrivPassword = '';
      return;
    }

    if (this.form.snmpVersion === 'V3') {
      this.form.snmpCommunity = '';
      return;
    }

    this.form.snmpPort = 161;
    this.form.snmpCommunity = '';
    this.form.snmpUsername = '';
    this.form.snmpAuthProtocol = '';
    this.form.snmpAuthPassword = '';
    this.form.snmpPrivProtocol = '';
    this.form.snmpPrivPassword = '';
  }

  protected onVendorChange() {
    const selectedVendor = this.form.vendor.trim();
    const currentType = this.form.type.trim();

    if (currentType) {
      const stillAllowed = this.allDeviceTypes().some((item) => {
        if (normalizeSearchText(item.name) !== normalizeSearchText(currentType)) {
          return false;
        }
        if (!selectedVendor) {
          return true;
        }
        return !item.vendor || normalizeSearchText(item.vendor) === normalizeSearchText(selectedVendor);
      });

      if (!stillAllowed) {
        this.form.type = '';
      }
    }

    this.refreshDeviceTypes();
  }

  protected addTag() {
    const name = this.newTagName.trim();
    if (!name) {
      return;
    }

    const color = this.newTagColor.toUpperCase();
    const nextTag = { name, color };
    const existingIndex = this.form.tags.findIndex((tag) => tag.name.toLocaleLowerCase('sk') === name.toLocaleLowerCase('sk'));
    if (existingIndex >= 0) {
      this.form.tags = this.form.tags.map((tag, index) => (index === existingIndex ? nextTag : tag));
    } else if (this.form.tags.length < 12) {
      this.form.tags = [...this.form.tags, nextTag];
    }
    this.newTagName = '';
  }

  protected removeTag(index: number) {
    this.form.tags = this.form.tags.filter((_, itemIndex) => itemIndex !== index);
  }

  protected selectTagColor(color: string) {
    this.newTagColor = color;
  }

  protected tagTextColor(color: string) {
    const hex = color.replace('#', '');
    if (hex.length !== 6) {
      return '#ffffff';
    }
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#0f172a' : '#ffffff';
  }

  private buildSnmpPayload() {
    if (!this.form.snmpVersion) {
      return null;
    }

    if (this.form.snmpVersion === 'V2C') {
      return {
        version: 'V2C' as const,
        port: Number(this.form.snmpPort) || 161,
        community: this.normalizeOptional(this.form.snmpCommunity),
      };
    }

    return {
      version: 'V3' as const,
      port: Number(this.form.snmpPort) || 161,
      username: this.normalizeOptional(this.form.snmpUsername),
      authProtocol: this.normalizeOptional(this.form.snmpAuthProtocol) as 'MD5' | 'SHA' | undefined,
      authPassword: this.normalizeOptional(this.form.snmpAuthPassword),
      privProtocol: this.normalizeOptional(this.form.snmpPrivProtocol) as 'DES' | 'AES' | undefined,
      privPassword: this.normalizeOptional(this.form.snmpPrivPassword),
    };
  }

  private normalizeOptional(value: string): string | undefined {
    const normalized = value.trim();
    return normalized || undefined;
  }

  private refreshDeviceTypes() {
    const selectedVendor = this.form.vendor.trim();
    const options = this.sortByLabel(
      this.allDeviceTypes()
        .filter((item) => {
          if (!selectedVendor) {
            return true;
          }
          return !item.vendor || normalizeSearchText(item.vendor) === normalizeSearchText(selectedVendor);
        })
        .map((item) => ({
          value: item.name,
          label: item.name,
          description: item.vendor ? `Vendor: ${item.vendor}` : 'Vendor: Any',
        })),
    );

    this.deviceTypes.set(this.withCurrentSelection(options, this.form.type));
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
