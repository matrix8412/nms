import { Component, inject, signal, computed, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';

interface CatalogItem { id: string; name: string; createdAt: string; }

type SortField = 'name' | 'createdAt';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-catalogs',
  standalone: true,
  imports: [CommonModule, FormsModule, SlidePanelComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Catalogs</h1>
        <p class="subtitle">Manage vendors and device types</p>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button class="tab" [class.active]="activeTab() === 'vendors'" (click)="activeTab.set('vendors')">
        <span class="material-icons">business</span> Vendors
      </button>
      <button class="tab" [class.active]="activeTab() === 'device-types'" (click)="activeTab.set('device-types')">
        <span class="material-icons">devices_other</span> Device Types
      </button>
    </div>

    <!-- Content -->
    <div class="table-card">
      <div class="table-toolbar">
        <div style="flex:1"></div>
        <button class="btn btn-primary" (click)="openCreate()">
          <span class="material-icons">add</span> Add {{ activeTab() === 'vendors' ? 'Vendor' : 'Device Type' }}
        </button>
      </div>

      <table class="data-table" *ngIf="sortedItems().length; else emptyState">
        <thead>
          <tr>
            <th class="sortable" (click)="toggleSort('name')">
              Name
              <span class="sort-icon material-icons">{{ getSortIcon('name') }}</span>
            </th>
            <th class="sortable" (click)="toggleSort('createdAt')">
              Created
              <span class="sort-icon material-icons">{{ getSortIcon('createdAt') }}</span>
            </th>
            <th class="col-actions">Actions</th>
          </tr>
          <tr class="filter-row">
            <th>
              <input type="text" class="th-filter" placeholder="Search…" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
            </th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of sortedItems()">
            <td class="cell-name">{{ item.name }}</td>
            <td class="cell-date">{{ item.createdAt | date:'mediumDate' }}</td>
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
          <span class="material-icons">{{ activeTab() === 'vendors' ? 'business' : 'devices_other' }}</span>
          <p>No {{ activeTab() === 'vendors' ? 'vendors' : 'device types' }} found</p>
        </div>
      </ng-template>
    </div>

    <!-- Create/Edit panel -->
    <app-slide-panel
      [isOpen]="panelOpen()"
      [title]="editingItem() ? 'Edit' : 'New ' + (activeTab() === 'vendors' ? 'Vendor' : 'Device Type')"
      (close)="panelOpen.set(false)"
    >
      <form (ngSubmit)="save()" class="panel-form">
        <label class="form-label">
          Name
          <input class="form-input" [(ngModel)]="formName" name="name" required />
        </label>
        <div class="panel-actions">
          <button type="button" class="btn btn-outline" (click)="panelOpen.set(false)">Cancel</button>
          <button type="submit" class="btn btn-primary">{{ editingItem() ? 'Update' : 'Create' }}</button>
        </div>
      </form>
    </app-slide-panel>

    <!-- Delete confirmation -->
    <div class="modal-overlay" *ngIf="deleteTarget()" (click)="deleteTarget.set(null)">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3>Delete {{ activeTab() === 'vendors' ? 'Vendor' : 'Device Type' }}</h3>
        <p>Are you sure you want to delete <strong>{{ deleteTarget()?.name }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn btn-outline" (click)="deleteTarget.set(null)">Cancel</button>
          <button class="btn btn-danger" (click)="doDelete()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

    .tab-bar { display: flex; gap: 4px; margin-bottom: 20px; background: #fff; border-radius: 10px; padding: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .tab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 8px; background: none; font-size: 0.88rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all .15s; }
    .tab:hover { background: #f1f5f9; color: #334155; }
    .tab.active { background: #3b82f6; color: #fff; }
    .tab .material-icons { font-size: 18px; }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: background .15s; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover { background: #2563eb; }
    .btn-outline { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn .material-icons { font-size: 18px; }

    .table-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
    .table-toolbar { display: flex; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; gap: 12px; align-items: center; }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 10px 20px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .data-table th.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
    .data-table th.sortable:hover { color: #334155; }
    .sort-icon { font-size: 14px; vertical-align: middle; margin-left: 2px; color: #c0c8d4; }
    .data-table th.sortable:hover .sort-icon { color: #64748b; }
    .filter-row th { padding: 6px 20px 10px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    .th-filter { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #fff; outline: none; color: #334155; box-sizing: border-box; }
    .th-filter:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.1); }
    .data-table td { padding: 12px 20px; font-size: 0.88rem; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .cell-name { font-weight: 600; color: #1a2332; }
    .cell-date { color: #64748b; font-size: 0.84rem; }
    .col-actions { width: 100px; text-align: right; }

    .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: #64748b; }
    .icon-btn:hover { background: #f1f5f9; color: #334155; }
    .icon-btn.danger:hover { color: #ef4444; background: #fef2f2; }
    .icon-btn .material-icons { font-size: 18px; }

    .empty { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; color: #94a3b8; }
    .empty .material-icons { font-size: 48px; margin-bottom: 12px; }
    .empty p { margin: 0; font-size: 0.92rem; }

    .panel-form { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
    .form-label { display: flex; flex-direction: column; gap: 6px; font-size: 0.84rem; font-weight: 600; color: #334155; }
    .form-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; }
    .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
    .panel-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 200; }
    .modal-card { background: #fff; border-radius: 14px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
    .modal-card h3 { margin: 0 0 8px; font-size: 1.1rem; }
    .modal-card p { margin: 0 0 20px; color: #64748b; font-size: 0.9rem; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
  `],
})
export class CatalogsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly activeTab = signal<'vendors' | 'device-types'>('vendors');
  protected readonly vendors = signal<CatalogItem[]>([]);
  protected readonly deviceTypes = signal<CatalogItem[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<SortField | ''>('');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly panelOpen = signal(false);
  protected readonly editingItem = signal<CatalogItem | null>(null);
  protected readonly deleteTarget = signal<CatalogItem | null>(null);

  protected formName = '';

  protected readonly filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const items = this.activeTab() === 'vendors' ? this.vendors() : this.deviceTypes();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  });

  protected readonly sortedItems = computed(() => {
    const items = this.filteredItems();
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

  ngOnInit() {
    this.loadAll();
  }

  private loadAll() {
    this.api.getVendors().subscribe((res: any) => this.vendors.set(res.data));
    this.api.getDeviceTypes().subscribe((res: any) => this.deviceTypes.set(res.data));
  }

  private loadActive() {
    if (this.activeTab() === 'vendors') {
      this.api.getVendors().subscribe((res: any) => this.vendors.set(res.data));
    } else {
      this.api.getDeviceTypes().subscribe((res: any) => this.deviceTypes.set(res.data));
    }
  }

  protected openCreate() {
    this.editingItem.set(null);
    this.formName = '';
    this.panelOpen.set(true);
  }

  protected openEdit(item: CatalogItem) {
    this.editingItem.set(item);
    this.formName = item.name;
    this.panelOpen.set(true);
  }

  protected save() {
    const edit = this.editingItem();
    const isVendor = this.activeTab() === 'vendors';
    const payload = { name: this.formName };

    const req = edit
      ? (isVendor ? this.api.updateVendor(edit.id, payload) : this.api.updateDeviceType(edit.id, payload))
      : (isVendor ? this.api.createVendor(payload) : this.api.createDeviceType(payload));

    req.subscribe(() => {
      this.panelOpen.set(false);
      this.loadActive();
    });
  }

  protected confirmDelete(item: CatalogItem) {
    this.deleteTarget.set(item);
  }

  protected doDelete() {
    const t = this.deleteTarget();
    if (!t) return;
    const isVendor = this.activeTab() === 'vendors';
    const req = isVendor ? this.api.deleteVendor(t.id) : this.api.deleteDeviceType(t.id);
    req.subscribe(() => {
      this.deleteTarget.set(null);
      this.loadActive();
    });
  }
}
