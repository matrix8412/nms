import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { ColumnFilterTriggerComponent } from '../../core/layout/column-filter-trigger.component';
import { SearchableSelectComponent, type SearchableSelectOption } from '../../core/layout/searchable-select.component';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';

interface CatalogItem {
  id: string;
  name: string;
  vendor?: string | null;
}

interface SnmpTemplateItem {
  id: string;
  vendor: string | null;
  deviceType: string | null;
  metricKey: SnmpMetricKey;
  oid: string;
  intervalSec: number;
  enabled: boolean;
  createdAt: string;
}

type SnmpMetricKey = string;
type SortField = 'vendor' | 'deviceType' | 'metricKey' | 'oid' | 'intervalSec';
type SortDir = 'asc' | 'desc';

const METRIC_KEY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'hostname', label: 'Hostname' },
  { value: 'softwareVersion', label: 'Software Version' },
  { value: 'uptime', label: 'Uptime' },
  { value: 'ifOperStatus', label: 'Interface Oper State' },
  { value: 'ifName', label: 'Interface Name' },
  { value: 'ifDescription', label: 'Interface Description' },
  { value: 'ifMac', label: 'Interface MAC' },
];

@Component({
  selector: 'app-snmp-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnFilterTriggerComponent, SearchableSelectComponent, SlidePanelComponent],
  template: `
    <div class="table-card">
      <div class="table-toolbar">
        <div class="toolbar-copy">
          <div class="toolbar-title">SNMP OID Templates</div>
          <div class="toolbar-subtitle">Templates are applied automatically from the host vendor and device type.</div>
          <div class="toolbar-subtitle">Priority: exact vendor + type, then vendor-only, then type-only, then default.</div>
        </div>
        <button class="btn btn-primary" (click)="openCreate()">
          <span class="material-icons">add</span> Add SNMP Template
        </button>
      </div>

      <table class="data-table" *ngIf="sortedItems().length; else emptyState">
        <thead>
          <tr>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('vendor')">
                  Vendor
                  <span class="sort-icon material-icons">{{ getSortIcon('vendor') }}</span>
                </button>
                <app-column-filter-trigger [active]="!!searchQuery()" label="Filter templates">
                  <input type="text" class="th-filter" placeholder="Search vendor, type, key, OID..." [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
                </app-column-filter-trigger>
              </div>
            </th>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('deviceType')">
                  Device Type
                  <span class="sort-icon material-icons">{{ getSortIcon('deviceType') }}</span>
                </button>
              </div>
            </th>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('metricKey')">
                  Metric
                  <span class="sort-icon material-icons">{{ getSortIcon('metricKey') }}</span>
                </button>
              </div>
            </th>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('oid')">
                  OID
                  <span class="sort-icon material-icons">{{ getSortIcon('oid') }}</span>
                </button>
              </div>
            </th>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('intervalSec')">
                  Interval
                  <span class="sort-icon material-icons">{{ getSortIcon('intervalSec') }}</span>
                </button>
              </div>
            </th>
            <th>Status</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of sortedItems()">
            <td class="cell-name">{{ item.vendor || 'Default' }}</td>
            <td>{{ item.deviceType || 'Any' }}</td>
            <td>{{ metricKeyLabel(item.metricKey) }}</td>
            <td class="cell-code">{{ item.oid }}</td>
            <td>{{ formatInterval(item.intervalSec) }}</td>
            <td>
              <span class="status-badge" [class.enabled]="item.enabled">{{ item.enabled ? 'Enabled' : 'Disabled' }}</span>
            </td>
            <td class="col-actions">
              <button class="icon-btn" title="Edit" (click)="openEdit(item)">
                <span class="material-icons">edit</span>
              </button>
              <button class="icon-btn danger" title="Delete" (click)="confirmDelete(item)">
                <span class="material-icons">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyState>
        <div class="empty">
          <span class="material-icons">router</span>
          <p>No SNMP templates defined yet.</p>
        </div>
      </ng-template>
    </div>

    <app-slide-panel [isOpen]="panelOpen()" [title]="editingItem() ? 'Edit SNMP Template' : 'New SNMP Template'" (close)="panelOpen.set(false)">
      <form (ngSubmit)="save()" class="panel-form">
        <label class="form-label">
          Vendor
          <app-searchable-select
            [(ngModel)]="form.vendor"
            [ngModelOptions]="{ standalone: true }"
            [options]="vendorOptions()"
            [compact]="true"
            placeholder="Any vendor"
            metaText="Optional vendor scope"
            searchPlaceholder="Search vendor"
            emptyOptionLabel="Any vendor"
            emptyStateLabel="No matching vendors"
          />
        </label>
        <label class="form-label">
          Device Type
          <app-searchable-select
            [(ngModel)]="form.deviceType"
            [ngModelOptions]="{ standalone: true }"
            [options]="deviceTypeOptions()"
            [compact]="true"
            placeholder="Any device type"
            metaText="Optional device-type scope"
            searchPlaceholder="Search device type"
            emptyOptionLabel="Any device type"
            emptyStateLabel="No matching device types"
          />
        </label>
        <label class="form-label">
          Metric Key
          <input class="form-input" list="snmp-metric-key-options" [(ngModel)]="form.metricKey" name="metricKey" placeholder="hostname or cpuLoad.1m" />
          <datalist id="snmp-metric-key-options">
            <option *ngFor="let option of metricKeyOptions()" [value]="option.value">{{ option.label }}</option>
          </datalist>
          <span class="form-help">Built-in keys are suggested. New keys are allowed and will be stored as snmp.custom.&lt;metricKey&gt;.</span>
        </label>
        <label class="form-label">
          OID
          <input class="form-input" [(ngModel)]="form.oid" name="oid" placeholder="1.3.6.1..." />
        </label>
        <label class="form-label">
          Poll Interval (seconds)
          <input class="form-input" type="number" min="30" max="86400" step="30" [(ngModel)]="form.intervalSec" name="intervalSec" />
        </label>
        <label class="form-label toggle-row">
          <span>Enabled</span>
          <input type="checkbox" [(ngModel)]="form.enabled" name="enabled" class="toggle" />
        </label>
        <div class="panel-actions">
          <button type="button" class="btn btn-outline" (click)="panelOpen.set(false)">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="save()">{{ editingItem() ? 'Update' : 'Create' }}</button>
        </div>
      </form>
    </app-slide-panel>

    <div class="modal-overlay" *ngIf="deleteTarget()" (click)="deleteTarget.set(null)">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3>Delete SNMP Template</h3>
        <p>Delete template for <strong>{{ metricKeyLabel(deleteTarget()!.metricKey) }}</strong> and OID <strong>{{ deleteTarget()!.oid }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn btn-outline" (click)="deleteTarget.set(null)">Cancel</button>
          <button class="btn btn-danger" (click)="doDelete()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; }
    .toolbar-copy { display: flex; flex-direction: column; gap: 4px; }
    .toolbar-title { font-size: 1rem; font-weight: 700; color: #1a2332; }
    .toolbar-subtitle { color: #64748b; font-size: 0.84rem; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: background .15s; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover { background: #2563eb; }
    .btn-outline { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn .material-icons { font-size: 18px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 10px 20px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .data-table td { padding: 12px 20px; font-size: 0.88rem; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .header-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .header-sort { display: inline-flex; align-items: center; gap: 2px; padding: 0; border: none; background: none; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
    .sort-icon { font-size: 14px; color: #c0c8d4; }
    .th-filter { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.82rem; background: #fff; }
    .cell-name { font-weight: 600; color: #1a2332; }
    .cell-code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
    .col-actions { width: 100px; text-align: right; }
    .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: #64748b; }
    .icon-btn:hover { background: #f1f5f9; color: #334155; }
    .icon-btn.danger:hover { color: #ef4444; background: #fef2f2; }
    .icon-btn .material-icons { font-size: 18px; }
    .status-badge { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; padding: 4px 10px; border-radius: 6px; background: #fee2e2; color: #dc2626; }
    .status-badge.enabled { background: #dcfce7; color: #16a34a; }
    .empty { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; color: #94a3b8; }
    .empty .material-icons { font-size: 48px; margin-bottom: 12px; }
    .panel-form { display: flex; flex-direction: column; gap: 16px; padding: 20px; position: relative; z-index: 1; }
    .form-label { display: flex; flex-direction: column; gap: 6px; font-size: 0.84rem; font-weight: 600; color: #334155; }
    .form-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; font-family: inherit; }
    .form-help { color: #64748b; font-size: 0.76rem; font-weight: 500; }
    .toggle-row { flex-direction: row; align-items: center; justify-content: space-between; }
    .toggle { width: 20px; height: 20px; accent-color: #3b82f6; }
    .panel-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; position: relative; z-index: 10; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 200; }
    .modal-card { background: #fff; border-radius: 14px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
    .modal-card h3 { margin: 0 0 8px; font-size: 1.1rem; }
    .modal-card p { margin: 0 0 20px; color: #64748b; font-size: 0.9rem; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
  `],
})
export class SnmpTemplatesComponent {
  private readonly api = inject(ApiService);

  protected readonly items = signal<SnmpTemplateItem[]>([]);
  protected readonly vendors = signal<CatalogItem[]>([]);
  protected readonly deviceTypes = signal<CatalogItem[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<SortField>('vendor');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly panelOpen = signal(false);
  protected readonly editingItem = signal<SnmpTemplateItem | null>(null);
  protected readonly deleteTarget = signal<SnmpTemplateItem | null>(null);

  protected form: {
    vendor: string;
    deviceType: string;
    metricKey: SnmpMetricKey;
    oid: string;
    intervalSec: number;
    enabled: boolean;
  } = {
    vendor: '',
    deviceType: '',
    metricKey: 'hostname',
    oid: '',
    intervalSec: 1800,
    enabled: true,
  };

  protected readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.items();
    }

    return this.items().filter((item) =>
      [item.vendor ?? '', item.deviceType ?? '', item.metricKey, item.oid, String(item.intervalSec)].some((value) => value.toLowerCase().includes(query)),
    );
  });

  protected readonly sortedItems = computed(() => {
    const items = [...this.filteredItems()];
    const field = this.sortField();
    const dir = this.sortDir();
    items.sort((left, right) => {
      if (field === 'intervalSec') {
        return left.intervalSec - right.intervalSec;
      }
      const leftValue = String(left[field] ?? '').toLowerCase();
      const rightValue = String(right[field] ?? '').toLowerCase();
      return leftValue.localeCompare(rightValue, 'sk', { sensitivity: 'base' });
    });
    return dir === 'desc' ? items.reverse() : items;
  });

  constructor() {
    this.loadItems();
    this.loadCatalogs();
  }

  protected toggleSort(field: SortField) {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortField.set(field);
    this.sortDir.set('asc');
  }

  protected getSortIcon(field: SortField) {
    if (this.sortField() !== field) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected metricKeyOptions(): Array<{ value: string; label: string }> {
    const options = [...METRIC_KEY_OPTIONS];
    for (const item of this.items()) {
      if (!options.some((option) => option.value === item.metricKey)) {
        options.push({ value: item.metricKey, label: this.formatMetricKeyLabel(item.metricKey) });
      }
    }
    if (this.form.metricKey && !options.some((option) => option.value === this.form.metricKey)) {
      options.unshift({ value: this.form.metricKey, label: this.formatMetricKeyLabel(this.form.metricKey) });
    }
    return options;
  }

  protected metricKeyLabel(value: SnmpMetricKey) {
    return this.metricKeyOptions().find((item) => item.value === value)?.label ?? this.formatMetricKeyLabel(value);
  }

  protected formatInterval(value: number) {
    if (value % 3600 === 0) {
      return `${value / 3600} h`;
    }
    if (value % 60 === 0) {
      return `${value / 60} min`;
    }
    return `${value} s`;
  }

  protected openCreate() {
    this.editingItem.set(null);
    this.form.vendor = '';
    this.form.deviceType = '';
    this.form.metricKey = 'hostname';
    this.form.oid = '';
    this.form.intervalSec = 1800;
    this.form.enabled = true;
    this.panelOpen.set(true);
  }

  protected openEdit(item: SnmpTemplateItem) {
    this.editingItem.set(item);
    this.form.vendor = item.vendor ?? '';
    this.form.deviceType = item.deviceType ?? '';
    this.form.metricKey = item.metricKey;
    this.form.oid = item.oid;
    this.form.intervalSec = item.intervalSec;
    this.form.enabled = item.enabled;
    this.panelOpen.set(true);
  }

  protected save() {
    const payload = {
      vendor: this.normalizeOptional(this.form.vendor),
      deviceType: this.normalizeOptional(this.form.deviceType),
      metricKey: this.normalizeMetricKey(this.form.metricKey),
      oid: this.form.oid.trim(),
      intervalSec: Math.max(30, Math.min(86400, Number(this.form.intervalSec) || 1800)),
      enabled: this.form.enabled,
    };

    const editing = this.editingItem();
    const request = editing
      ? this.api.updateSnmpTemplate(editing.id, payload)
      : this.api.createSnmpTemplate(payload);

    request.subscribe({
      next: () => {
        this.panelOpen.set(false);
        this.loadItems();
      },
      error: (error: unknown) => {
        console.error('Failed to save SNMP template:', error);
      },
    });
  }

  protected confirmDelete(item: SnmpTemplateItem) {
    this.deleteTarget.set(item);
  }

  protected doDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.api.deleteSnmpTemplate(target.id).subscribe(() => {
      this.deleteTarget.set(null);
      this.loadItems();
    });
  }

  private loadItems() {
    this.api.getSnmpTemplates().subscribe((res: any) => this.items.set(res.data));
  }

  private loadCatalogs() {
    this.api.getVendors().subscribe((res: any) => this.vendors.set(res.data));
    this.api.getDeviceTypes().subscribe((res: any) => this.deviceTypes.set(res.data));
  }

  protected vendorOptions(): SearchableSelectOption[] {
    return this.catalogOptions(this.vendors(), this.form.vendor);
  }

  protected deviceTypeOptions(): SearchableSelectOption[] {
    return this.catalogOptions(this.deviceTypes(), this.form.deviceType, (item) => item.vendor || null);
  }

  private catalogOptions(items: CatalogItem[], currentValue: string, description?: (item: CatalogItem) => string | null): SearchableSelectOption[] {
    const options = items.map((item) => ({
      value: item.name,
      label: item.name,
      description: description?.(item) ?? null,
    }));
    const normalizedCurrent = this.normalizeOptional(currentValue);
    if (normalizedCurrent && !options.some((option) => option.value === normalizedCurrent)) {
      options.unshift({ value: normalizedCurrent, label: normalizedCurrent, description: 'Current value' });
    }
    return options;
  }

  private formatMetricKeyLabel(value: string) {
    return value
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (segment) => segment.toUpperCase());
  }

  private normalizeMetricKey(value: string) {
    return value.trim();
  }

  private normalizeOptional(value: string) {
    const normalized = value.trim();
    return normalized || null;
  }
}