import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';
import { HostFormComponent } from './host-form.component';
import type { DeviceDto } from '@nms/shared';

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

    <!-- Filters -->
    <div class="filter-bar">
      <div class="search-box">
        <span class="material-icons search-icon">search</span>
        <input
          type="text"
          placeholder="Search by name, IP, vendor..."
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch()"
        />
      </div>
      <div class="filter-chips">
        <button
          class="chip"
          [class.active]="typeFilter() === ''"
          (click)="setTypeFilter('')"
        >All</button>
        <button
          *ngFor="let t of availableTypes()"
          class="chip"
          [class.active]="typeFilter() === t"
          (click)="setTypeFilter(t)"
        >{{ t }}</button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>IP Address</th>
              <th>Vendor</th>
              <th>Type</th>
              <th>Zabbix ID</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let host of filteredHosts()" class="row-hover">
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
            <tr *ngIf="filteredHosts().length === 0 && !loading()">
              <td colspan="6" class="empty">
                {{ searchQuery ? 'No hosts matching your search.' : 'No hosts found. Add your first host.' }}
              </td>
            </tr>
            <tr *ngIf="loading()">
              <td colspan="6" class="empty">Loading...</td>
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
      .btn-primary {
        background: #3b82f6;
        color: #fff;
      }
      .btn-primary:hover { background: #2563eb; box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
      .btn-secondary { background: #e2e8f0; color: #475569; }
      .btn-secondary:hover { background: #cbd5e1; }
      .btn-danger { background: #ef4444; color: #fff; }
      .btn-danger:hover { background: #dc2626; }

      /* Filters */
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .search-box {
        display: flex;
        align-items: center;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0 12px;
        flex: 1;
        min-width: 220px;
        max-width: 400px;
      }
      .search-icon { color: #94a3b8; font-size: 20px; }
      .search-box input {
        border: none;
        outline: none;
        padding: 10px 8px;
        font-size: 0.88rem;
        background: transparent;
        width: 100%;
        font-family: inherit;
      }

      .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
      .chip {
        padding: 6px 14px;
        border-radius: 20px;
        border: 1px solid #e2e8f0;
        background: #fff;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        color: #64748b;
        transition: all 0.15s;
        font-family: inherit;
      }
      .chip.active {
        background: #3b82f6;
        color: #fff;
        border-color: #3b82f6;
      }
      .chip:hover:not(.active) { border-color: #94a3b8; }

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
        padding: 12px 16px;
        font-size: 0.78rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
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
export class HostListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected searchQuery = '';
  protected readonly loading = signal(true);
  protected readonly hosts = signal<DeviceDto[]>([]);
  protected readonly typeFilter = signal('');
  protected readonly panelOpen = signal(false);
  protected readonly editingHost = signal<DeviceDto | null>(null);
  protected readonly deletingHost = signal<DeviceDto | null>(null);

  protected readonly availableTypes = signal<string[]>([]);

  protected readonly filteredHosts = signal<DeviceDto[]>([]);

  ngOnInit() {
    this.loadHosts();
  }

  private loadHosts() {
    this.loading.set(true);
    this.api.getDevices(this.searchQuery).subscribe({
      next: (res) => {
        this.hosts.set(res.data);
        this.extractTypes(res.data);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private extractTypes(devices: DeviceDto[]) {
    const types = new Set<string>();
    for (const d of devices) {
      if (d.type) types.add(d.type);
    }
    this.availableTypes.set([...types].sort());
  }

  private applyFilter() {
    const filter = this.typeFilter();
    const hosts = this.hosts();
    this.filteredHosts.set(
      filter ? hosts.filter((h) => h.type === filter) : hosts,
    );
  }

  protected onSearch() {
    this.loadHosts();
  }

  protected setTypeFilter(t: string) {
    this.typeFilter.set(t);
    this.applyFilter();
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
