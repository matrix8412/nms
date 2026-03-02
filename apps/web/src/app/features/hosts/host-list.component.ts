import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';
import { HostFormComponent } from './host-form.component';
import type { DeviceDto } from '@nms/shared';

type SortField = 'icmpStatus' | 'name' | 'ip' | 'vendor' | 'type' | 'zabbixHostId';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-host-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SlidePanelComponent, HostFormComponent],
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
              <th class="sortable status-col" (click)="toggleSort('icmpStatus')">
                Status
                <span class="sort-icon material-icons">{{ getSortIcon('icmpStatus') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('name')">
                Name
                <span class="sort-icon material-icons">{{ getSortIcon('name') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('ip')">
                IP Address
                <span class="sort-icon material-icons">{{ getSortIcon('ip') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('vendor')">
                Vendor
                <span class="sort-icon material-icons">{{ getSortIcon('vendor') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('type')">
                Type
                <span class="sort-icon material-icons">{{ getSortIcon('type') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('zabbixHostId')">
                Zabbix ID
                <span class="sort-icon material-icons">{{ getSortIcon('zabbixHostId') }}</span>
              </th>
              <th class="actions-col">Actions</th>
            </tr>
            <tr class="filter-row">
              <th>
                <select class="th-filter" [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()">
                  <option value="">All</option>
                  <option value="UP">Up</option>
                  <option value="DOWN">Down</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </th>
              <th>
                <input type="text" class="th-filter" placeholder="Search…" [(ngModel)]="filterName" (ngModelChange)="applyFilter()" />
              </th>
              <th>
                <input type="text" class="th-filter" placeholder="Search…" [(ngModel)]="filterIp" (ngModelChange)="applyFilter()" />
              </th>
              <th>
                <input type="text" class="th-filter" placeholder="Search…" [(ngModel)]="filterVendor" (ngModelChange)="applyFilter()" />
              </th>
              <th>
                <select class="th-filter" [(ngModel)]="filterType" (ngModelChange)="applyFilter()">
                  <option value="">All</option>
                  <option *ngFor="let t of availableTypes()" [value]="t">{{ t }}</option>
                </select>
              </th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let host of sortedHosts()" class="row-hover">
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
                <a [routerLink]="['/hosts', host.id]" class="host-link">{{ host.name }}</a>
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
      .sort-icon { font-size: 14px; vertical-align: middle; margin-left: 2px; color: #94a3b8; }
      th.sortable:hover .sort-icon { color: #64748b; }

      .filter-row th {
        padding: 6px 16px 10px;
        background: #f8fafc;
        border-bottom: 2px solid #e2e8f0;
      }
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
      select.th-filter { cursor: pointer; }

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
    const name = this.filterName.toLowerCase();
    const ip = this.filterIp.toLowerCase();
    const vendor = this.filterVendor.toLowerCase();
    const type = this.filterType;
    const status = this.filterStatus;
    this.filteredHosts.set(
      this.hosts().filter((h) =>
        (!name || (h.name ?? '').toLowerCase().includes(name)) &&
        (!ip || (h.ip ?? '').toLowerCase().includes(ip)) &&
        (!vendor || (h.vendor ?? '').toLowerCase().includes(vendor)) &&
        (!type || h.type === type) &&
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
