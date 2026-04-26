import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { ColumnFilterTriggerComponent } from '../../core/layout/column-filter-trigger.component';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';
import { SearchableSelectComponent, type SearchableSelectOption } from '../../core/layout/searchable-select.component';
import { matchesSearchText, normalizeSearchText } from '../../core/utils/search.util';
import { HostFormComponent } from './host-form.component';
import type { DeviceDto } from '@nms/shared';

type SortField = 'icmpStatus' | 'name' | 'ip' | 'vendor' | 'type' | 'zabbixHostId';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-host-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SlidePanelComponent, HostFormComponent, SearchableSelectComponent, ColumnFilterTriggerComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Hosts</h1>
        <p class="subtitle">Manage all network hosts</p>
      </div>
      <button class="btn btn-primary" (click)="openAddPanel()">
        <span class="material-icons">add</span>
        Add Host
      </button>
    </div>

    <!-- Table -->
    <div class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable status-col">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('icmpStatus')">
                    Status
                    <span class="sort-icon material-icons">{{ getSortIcon('icmpStatus') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!filterStatus" label="Filter status">
                    <app-searchable-select
                      [(ngModel)]="filterStatus"
                      (ngModelChange)="applyFilter()"
                      [ngModelOptions]="{ standalone: true }"
                      [options]="statusOptions"
                      placeholder="All"
                      searchPlaceholder="Search status"
                      emptyOptionLabel="All"
                      emptyStateLabel="No matching statuses"
                      [compact]="true"
                    />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('name')">
                    Name
                    <span class="sort-icon material-icons">{{ getSortIcon('name') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!filterName" label="Filter name">
                    <input type="text" class="th-filter" placeholder="Search..." [(ngModel)]="filterName" (ngModelChange)="applyFilter()" />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('ip')">
                    IP Address
                    <span class="sort-icon material-icons">{{ getSortIcon('ip') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!filterIp" label="Filter IP address">
                    <input type="text" class="th-filter" placeholder="Search..." [(ngModel)]="filterIp" (ngModelChange)="applyFilter()" />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('vendor')">
                    Vendor
                    <span class="sort-icon material-icons">{{ getSortIcon('vendor') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!filterVendor" label="Filter vendor">
                    <input type="text" class="th-filter" placeholder="Search..." [(ngModel)]="filterVendor" (ngModelChange)="applyFilter()" />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('type')">
                    Type
                    <span class="sort-icon material-icons">{{ getSortIcon('type') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!filterType" label="Filter type">
                    <app-searchable-select
                      [(ngModel)]="filterType"
                      (ngModelChange)="applyFilter()"
                      [ngModelOptions]="{ standalone: true }"
                      [options]="typeOptions()"
                      placeholder="All"
                      searchPlaceholder="Search type"
                      emptyOptionLabel="All"
                      emptyStateLabel="No matching device types"
                      [compact]="true"
                    />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('zabbixHostId')">
                    Zabbix ID
                    <span class="sort-icon material-icons">{{ getSortIcon('zabbixHostId') }}</span>
                  </button>
                </div>
              </th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let host of sortedHosts()">
              <tr class="row-hover">
                <td class="status-col">
                  <span class="status-dot"
                        [class.status-up]="host.icmpStatus === 'UP'"
                        [class.status-down]="host.icmpStatus === 'DOWN'"
                        [class.status-unknown]="host.icmpStatus === 'UNKNOWN'"
                        [title]="host.icmpStatus + (host.lastPingDuration != null ? ' (' + host.lastPingDuration + ' ms)' : '')">
                  </span>
                  <span class="status-label"
                        [class.status-up-text]="host.icmpStatus === 'UP'"
                        [class.status-down-text]="host.icmpStatus === 'DOWN'"
                        [class.status-unknown-text]="host.icmpStatus === 'UNKNOWN'">
                    {{ host.icmpStatus }}
                  </span>
                </td>
                <td>
                  <div class="host-cell">
                    <button
                      *ngIf="host.snmpInterfaces?.length"
                      type="button"
                      class="expand-btn"
                      (click)="toggleExpanded(host.id)"
                      [attr.aria-expanded]="isExpanded(host.id)">
                      <span class="material-icons">{{ isExpanded(host.id) ? 'expand_less' : 'expand_more' }}</span>
                    </button>
                    <span *ngIf="!host.snmpInterfaces?.length" class="expand-spacer"></span>
                    <div class="host-copy">
                      <a [routerLink]="['/hosts', host.id]" class="host-link">{{ host.name }}</a>
                      <div class="host-meta" *ngIf="host.snmpHostname || host.snmpSoftwareVersion">
                        {{ host.snmpHostname || host.snmpSoftwareVersion }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="mono">{{ host.ip }}</td>
                <td>{{ host.vendor || '—' }}</td>
                <td>
                  <span class="type-badge" *ngIf="host.type">{{ host.type }}</span>
                  <span *ngIf="!host.type">—</span>
                </td>
                <td class="mono">{{ host.zabbixHostId || '—' }}</td>
                <td class="actions-col">
                  <button class="icon-btn" title="View" (click)="viewHost(host)">
                    <span class="material-icons">visibility</span>
                  </button>
                  <button class="icon-btn" title="Edit" (click)="openEditPanel(host)">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="icon-btn danger" title="Delete" (click)="confirmDelete(host)">
                    <span class="material-icons">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="isExpanded(host.id)" class="interface-row">
                <td colspan="7" class="interface-cell">
                  <div class="interface-panel">
                    <div class="interface-summary">
                      <span class="summary-pill" [class.summary-pill-up]="host.snmpStatus === 'UP'" [class.summary-pill-down]="host.snmpStatus === 'DOWN'">
                        SNMP {{ host.snmpStatus }}
                      </span>
                      <span class="summary-pill" *ngIf="host.snmp?.version">{{ host.snmp?.version }} / {{ host.snmp?.port }}</span>
                      <span class="summary-pill" *ngIf="host.snmpSoftwareVersion">{{ host.snmpSoftwareVersion }}</span>
                      <span class="summary-pill" *ngIf="host.snmpUptimeTicks != null">Uptime {{ formatSnmpUptime(host.snmpUptimeTicks) }}</span>
                    </div>

                    <div class="table-wrap interface-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>MAC</th>
                            <th>Oper State</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let item of host.snmpInterfaces || []">
                            <td class="mono">{{ item.index }}</td>
                            <td>{{ item.name }}</td>
                            <td>{{ item.description || '—' }}</td>
                            <td class="mono">{{ item.mac || '—' }}</td>
                            <td>
                              <span class="interface-state" [class.interface-state-up]="item.operStatus === 'up'" [class.interface-state-down]="item.operStatus === 'down'">
                                {{ item.operStatus || 'unknown' }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </ng-container>
            <tr *ngIf="sortedHosts().length === 0 && !loading()">
              <td colspan="7" class="empty">No hosts matching your filters.</td>
            </tr>
            <tr *ngIf="loading()">
              <td colspan="7" class="empty">Loading...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Slide Panel for Add/Edit -->
    <app-slide-panel
      [isOpen]="panelOpen()"
      [title]="editingHost() ? 'Edit Host' : 'Add Host'"
      (close)="closePanel()"
    >
      <app-host-form
        *ngIf="panelOpen()"
        [host]="editingHost()"
        (saved)="onSaved()"
        (cancelled)="closePanel()"
      />
    </app-slide-panel>

    <!-- Delete confirmation dialog -->
    <div class="confirm-overlay" *ngIf="deletingHost()" (click)="deletingHost.set(null)">
      <div class="confirm-dialog" (click)="$event.stopPropagation()">
        <h3>Delete Host</h3>
        <p>Are you sure you want to delete <strong>{{ deletingHost()?.name }}</strong>?</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" (click)="deletingHost.set(null)">Cancel</button>
          <button class="btn btn-danger" (click)="deleteHost()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 16px;
        flex-wrap: wrap;
      }
      .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
      .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

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
        transition: background 0.15s, box-shadow 0.15s;
        font-family: inherit;
      }
      .btn .material-icons { font-size: 18px; }
      .btn-primary { background: #3b82f6; color: #fff; }
      .btn-primary:hover { background: #2563eb; box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
      .btn-secondary { background: #e2e8f0; color: #475569; }
      .btn-secondary:hover { background: #cbd5e1; }
      .btn-danger { background: #ef4444; color: #fff; }
      .btn-danger:hover { background: #dc2626; }

      /* Table */
      .table-card {
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .table-wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      th {
        text-align: left;
        padding: 10px 16px;
        font-size: 0.78rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
      th.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
      th.sortable:hover { color: #334155; }
      .header-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .header-sort {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        font: inherit;
        text-transform: inherit;
        letter-spacing: inherit;
        cursor: pointer;
      }
      .header-sort:hover { color: #334155; }
      .sort-icon { font-size: 14px; vertical-align: middle; margin-left: 2px; color: #94a3b8; }
      th.sortable:hover .sort-icon, .header-sort:hover .sort-icon { color: #64748b; }
      .th-filter {
        width: 100%;
        padding: 6px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 0.82rem;
        font-family: inherit;
        background: #fff;
        outline: none;
        color: #334155;
        box-sizing: border-box;
      }
      .th-filter:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }

      /* Status indicators */
      .status-col { width: 90px; text-align: center; }
      .status-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 6px;
        vertical-align: middle;
        background: #94a3b8;
      }
      .status-dot.status-up { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.4); }
      .status-dot.status-down { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.4); }
      .status-dot.status-unknown { background: #94a3b8; }
      .status-label { font-size: 0.78rem; font-weight: 600; vertical-align: middle; }
      .status-up-text { color: #16a34a; }
      .status-down-text { color: #dc2626; }
      .status-unknown-text { color: #94a3b8; }

      td {
        padding: 12px 16px;
        font-size: 0.86rem;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
      }
      .row-hover:hover { background: #f8fafc; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }
      .host-link { color: #3b82f6; text-decoration: none; font-weight: 600; }
      .host-link:hover { text-decoration: underline; }
      .host-cell {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .expand-btn {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 8px;
        background: #e2e8f0;
        color: #334155;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
      }
      .expand-btn:hover {
        background: #cbd5e1;
      }
      .expand-btn .material-icons {
        font-size: 18px;
      }
      .expand-spacer {
        width: 28px;
        flex: 0 0 auto;
      }
      .host-copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .host-meta {
        color: #64748b;
        font-size: 0.78rem;
      }

      .type-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 0.78rem;
        font-weight: 600;
      }

      .actions-col { text-align: right; white-space: nowrap; }

      .icon-btn {
        border: none;
        background: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        color: #64748b;
        transition: background 0.15s, color 0.15s;
      }
      .icon-btn:hover { background: #f1f5f9; color: #1a2332; }
      .icon-btn.danger:hover { background: #fef2f2; color: #ef4444; }
      .icon-btn .material-icons { font-size: 18px; }

      .empty {
        text-align: center;
        color: #94a3b8;
        padding: 32px 16px !important;
      }

      .interface-row {
        background: #f8fafc;
      }
      .interface-cell {
        padding: 0 !important;
      }
      .interface-panel {
        padding: 16px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .interface-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .summary-pill,
      .interface-state {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #334155;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .summary-pill-up,
      .interface-state-up {
        background: #dcfce7;
        color: #166534;
      }
      .summary-pill-down,
      .interface-state-down {
        background: #fee2e2;
        color: #b91c1c;
      }
      .interface-table-wrap {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #fff;
      }

      /* Delete Confirm */
      .confirm-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .confirm-dialog {
        background: #fff;
        border-radius: 16px;
        padding: 28px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      }
      .confirm-dialog h3 { margin: 0 0 8px; font-size: 1.1rem; color: #1a2332; }
      .confirm-dialog p { margin: 0 0 20px; color: #64748b; font-size: 0.9rem; }
      .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }
    `,
  ],
})
export class HostListComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly POLL_INTERVAL_MS = 30_000;
  protected readonly statusOptions: SearchableSelectOption[] = [
    { value: 'UP', label: 'Up' },
    { value: 'DOWN', label: 'Down' },
    { value: 'UNKNOWN', label: 'Unknown' },
  ];

  protected filterName = '';
  protected filterIp = '';
  protected filterVendor = '';
  protected filterType = '';
  protected filterStatus = '';
  protected readonly loading = signal(true);
  protected readonly hosts = signal<DeviceDto[]>([]);
  protected readonly panelOpen = signal(false);
  protected readonly editingHost = signal<DeviceDto | null>(null);
  protected readonly deletingHost = signal<DeviceDto | null>(null);

  protected readonly availableTypes = signal<string[]>([]);
  protected readonly filteredHosts = signal<DeviceDto[]>([]);
  protected readonly expandedHostIds = signal<string[]>([]);
  protected readonly typeOptions = computed<SearchableSelectOption[]>(() =>
    this.availableTypes().map((type) => ({ value: type, label: type })),
  );

  protected readonly sortField = signal<SortField | ''>('');
  protected readonly sortDir = signal<SortDir>('asc');

  protected readonly sortedHosts = computed(() => {
    const items = this.filteredHosts();
    const field = this.sortField();
    const dir = this.sortDir();
    if (!field) return items;
    const sorted = [...items].sort((a, b) => {
      const aVal = (a[field] ?? '').toString().toLowerCase();
      const bVal = (b[field] ?? '').toString().toLowerCase();
      return aVal.localeCompare(bVal);
    });
    return dir === 'desc' ? sorted.reverse() : sorted;
  });

  ngOnInit() {
    this.loadHosts();
    this.pollTimer = setInterval(() => this.refreshHosts(), HostListComponent.POLL_INTERVAL_MS);
  }

  ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Full load (shows loading indicator) */
  private loadHosts() {
    this.loading.set(true);
    this.api.getDevices().subscribe({
      next: (res) => {
        this.hosts.set(res.data);
        this.extractTypes(res.data);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Silent refresh — updates data without showing the loading state */
  private refreshHosts() {
    this.api.getDevices().subscribe({
      next: (res) => {
        this.hosts.set(res.data);
        this.extractTypes(res.data);
        this.applyFilter();
      },
    });
  }

  private extractTypes(devices: DeviceDto[]) {
    const types = new Set<string>();
    for (const d of devices) {
      if (d.type) types.add(d.type);
    }
    this.availableTypes.set([...types].sort());
  }

  protected applyFilter() {
    const name = normalizeSearchText(this.filterName);
    const ip = normalizeSearchText(this.filterIp);
    const vendor = normalizeSearchText(this.filterVendor);
    const type = normalizeSearchText(this.filterType);
    const status = this.filterStatus;
    this.filteredHosts.set(
      this.hosts().filter((h) =>
        matchesSearchText(h.name, name) &&
        matchesSearchText(h.ip, ip) &&
        matchesSearchText(h.vendor, vendor) &&
        matchesSearchText(h.type, type) &&
        (!status || h.icmpStatus === status)
      ),
    );
  }

  protected toggleSort(field: SortField) {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  protected getSortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected openAddPanel() {
    this.editingHost.set(null);
    this.panelOpen.set(true);
  }

  protected openEditPanel(host: DeviceDto) {
    this.editingHost.set(host);
    this.panelOpen.set(true);
  }

  protected closePanel() {
    this.panelOpen.set(false);
    this.editingHost.set(null);
  }

  protected onSaved() {
    this.closePanel();
    this.loadHosts();
  }

  protected toggleExpanded(hostId: string) {
    this.expandedHostIds.update((ids) =>
      ids.includes(hostId) ? ids.filter((item) => item !== hostId) : [...ids, hostId],
    );
  }

  protected isExpanded(hostId: string) {
    return this.expandedHostIds().includes(hostId);
  }

  protected formatSnmpUptime(ticks: number) {
    const totalSeconds = Math.floor(ticks / 100);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const dayPart = days > 0 ? `${days}d ` : '';
    return `${dayPart}${hours}h ${minutes}m ${seconds}s`.trim();
  }

  protected viewHost(host: DeviceDto) {
    this.router.navigate(['/hosts', host.id]);
  }

  protected confirmDelete(host: DeviceDto) {
    this.deletingHost.set(host);
  }

  protected deleteHost() {
    const host = this.deletingHost();
    if (!host) return;
    this.api.deleteDevice(host.id).subscribe({
      next: () => {
        this.deletingHost.set(null);
        this.loadHosts();
      },
    });
  }
}
