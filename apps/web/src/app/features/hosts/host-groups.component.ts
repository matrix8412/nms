import { Component, inject, signal, computed, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';

interface DeviceGroup {
  id: string;
  name: string;
  description: string | null;
  _count?: { devices: number };
  createdAt: string;
}

@Component({
  selector: 'app-host-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, SlidePanelComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Host Groups</h1>
        <p class="subtitle">Organize hosts into logical groups</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">
        <span class="material-icons">add</span> New Group
      </button>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" placeholder="Search groups…" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
        </div>
      </div>
      <table class="data-table" *ngIf="filtered().length; else emptyState">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Hosts</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let g of filtered()">
            <td class="cell-name">{{ g.name }}</td>
            <td class="cell-desc">{{ g.description || '—' }}</td>
            <td>{{ g._count?.devices ?? 0 }}</td>
            <td class="col-actions">
              <button class="icon-btn" title="Edit" (click)="openEdit(g)">
                <span class="material-icons">edit</span>
              </button>
              <button class="icon-btn danger" title="Delete" (click)="confirmDelete(g)">
                <span class="material-icons">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #emptyState>
        <div class="empty">
          <span class="material-icons">folder_off</span>
          <p>No host groups found</p>
        </div>
      </ng-template>
    </div>

    <!-- Create / Edit panel -->
    <app-slide-panel
      [isOpen]="panelOpen()"
      [title]="editing() ? 'Edit Group' : 'New Group'"
      (close)="panelOpen.set(false)"
    >
      <form (ngSubmit)="save()" class="panel-form">
        <label class="form-label">
          Name
          <input class="form-input" [(ngModel)]="formName" name="name" required />
        </label>
        <label class="form-label">
          Description
          <textarea class="form-input" [(ngModel)]="formDesc" name="desc" rows="3"></textarea>
        </label>
        <div class="panel-actions">
          <button type="button" class="btn btn-outline" (click)="panelOpen.set(false)">Cancel</button>
          <button type="submit" class="btn btn-primary">{{ editing() ? 'Update' : 'Create' }}</button>
        </div>
      </form>
    </app-slide-panel>

    <!-- Delete confirmation -->
    <div class="modal-overlay" *ngIf="deleteTarget()" (click)="deleteTarget.set(null)">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3>Delete Group</h3>
        <p>Are you sure you want to delete <strong>{{ deleteTarget()?.name }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn btn-outline" (click)="deleteTarget.set(null)">Cancel</button>
          <button class="btn btn-danger" (click)="doDelete()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: background .15s; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover { background: #2563eb; }
    .btn-outline { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn .material-icons { font-size: 18px; }

    .table-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
    .table-toolbar { display: flex; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; gap: 12px; }
    .search-box { display: flex; align-items: center; gap: 8px; background: #f8fafc; border-radius: 8px; padding: 6px 12px; flex: 1; max-width: 360px; }
    .search-box .material-icons { font-size: 18px; color: #94a3b8; }
    .search-box input { border: none; background: none; outline: none; font-size: 0.88rem; width: 100%; }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 10px 20px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 12px 20px; font-size: 0.88rem; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .cell-name { font-weight: 600; color: #1a2332; }
    .cell-desc { color: #64748b; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
export class HostGroupsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly groups = signal<DeviceGroup[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<DeviceGroup | null>(null);
  protected readonly deleteTarget = signal<DeviceGroup | null>(null);

  protected formName = '';
  protected formDesc = '';

  protected readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.groups().filter((g) => g.name.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.load();
  }

  private load() {
    this.api.getDeviceGroups().subscribe((res: any) => this.groups.set(res.data));
  }

  protected openCreate() {
    this.editing.set(null);
    this.formName = '';
    this.formDesc = '';
    this.panelOpen.set(true);
  }

  protected openEdit(g: DeviceGroup) {
    this.editing.set(g);
    this.formName = g.name;
    this.formDesc = g.description ?? '';
    this.panelOpen.set(true);
  }

  protected save() {
    const payload = { name: this.formName, description: this.formDesc || null };
    const edit = this.editing();
    const req = edit
      ? this.api.updateDeviceGroup(edit.id, payload)
      : this.api.createDeviceGroup(payload);

    req.subscribe(() => {
      this.panelOpen.set(false);
      this.load();
    });
  }

  protected confirmDelete(g: DeviceGroup) {
    this.deleteTarget.set(g);
  }

  protected doDelete() {
    const t = this.deleteTarget();
    if (!t) return;
    this.api.deleteDeviceGroup(t.id).subscribe(() => {
      this.deleteTarget.set(null);
      this.load();
    });
  }
}
