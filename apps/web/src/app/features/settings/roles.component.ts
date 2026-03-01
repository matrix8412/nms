import { Component, inject, signal, computed, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';

interface Permission { id?: string; resource: string; action: string; }
interface Role {
  id: string;
  name: string;
  description: string | null;
  builtIn: boolean;
  permissions: Permission[];
  createdAt: string;
}

type SortField = 'name' | 'description' | 'permissions';
type SortDir = 'asc' | 'desc';

const RESOURCES = ['devices', 'device-groups', 'events', 'audit-logs', 'users', 'settings', 'integrations', 'catalogs'] as const;
const ACTIONS = ['read', 'create', 'update', 'delete'] as const;

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, SlidePanelComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Roles &amp; Permissions</h1>
        <p class="subtitle">Define roles and fine-grained access control</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">
        <span class="material-icons">add</span> New Role
      </button>
    </div>

    <div class="table-card">
      <table class="data-table" *ngIf="sortedRoles().length; else emptyState">
        <thead>
          <tr>
            <th class="sortable" (click)="toggleSort('name')">
              Role Name
              <span class="sort-icon material-icons">{{ getSortIcon('name') }}</span>
            </th>
            <th class="sortable" (click)="toggleSort('description')">
              Description
              <span class="sort-icon material-icons">{{ getSortIcon('description') }}</span>
            </th>
            <th class="sortable" (click)="toggleSort('permissions')">
              Permissions
              <span class="sort-icon material-icons">{{ getSortIcon('permissions') }}</span>
            </th>
            <th class="col-actions">Actions</th>
          </tr>
          <tr class="filter-row">
            <th>
              <input type="text" class="th-filter" placeholder="Search…" [ngModel]="filterName()" (ngModelChange)="filterName.set($event)" />
            </th>
            <th>
              <input type="text" class="th-filter" placeholder="Search…" [ngModel]="filterDescription()" (ngModelChange)="filterDescription.set($event)" />
            </th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of sortedRoles()">
            <td class="cell-name">
              {{ r.name }}
              <span class="badge built-in" *ngIf="r.builtIn">Built-in</span>
            </td>
            <td class="cell-desc">{{ r.description || '—' }}</td>
            <td><span class="perm-count">{{ r.permissions.length }}</span></td>
            <td class="col-actions">
              <button class="icon-btn" title="Edit" (click)="openEdit(r)">
                <span class="material-icons">edit</span>
              </button>
              <button class="icon-btn danger" title="Delete" (click)="confirmDelete(r)" *ngIf="!r.builtIn">
                <span class="material-icons">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #emptyState>
        <div class="empty">
          <span class="material-icons">admin_panel_settings</span>
          <p>No roles defined</p>
        </div>
      </ng-template>
    </div>

    <!-- Create/Edit panel -->
    <app-slide-panel
      [isOpen]="panelOpen()"
      [title]="editing() ? 'Edit Role' : 'New Role'"
      (close)="panelOpen.set(false)"
    >
      <form (ngSubmit)="save()" class="panel-form">
        <label class="form-label">
          Name
          <input class="form-input" [(ngModel)]="formName" name="name" required [disabled]="editing()?.builtIn" />
        </label>
        <label class="form-label">
          Description
          <textarea class="form-input" [(ngModel)]="formDesc" name="desc" rows="2"></textarea>
        </label>

        <div class="perm-section">
          <h4>Permissions</h4>
          <div class="perm-grid">
            <div class="perm-header"></div>
            <div class="perm-header" *ngFor="let a of actions">{{ a }}</div>
            <ng-container *ngFor="let r of resources">
              <div class="perm-resource">{{ r }}</div>
              <div *ngFor="let a of actions" class="perm-cell">
                <input type="checkbox" [checked]="hasPermission(r, a)" (change)="togglePermission(r, a)" />
              </div>
            </ng-container>
          </div>
        </div>

        <div class="panel-actions">
          <button type="button" class="btn btn-outline" (click)="panelOpen.set(false)">Cancel</button>
          <button type="submit" class="btn btn-primary">{{ editing() ? 'Update' : 'Create' }}</button>
        </div>
      </form>
    </app-slide-panel>

    <!-- Delete confirmation -->
    <div class="modal-overlay" *ngIf="deleteTarget()" (click)="deleteTarget.set(null)">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3>Delete Role</h3>
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
    .cell-name { font-weight: 600; color: #1a2332; white-space: nowrap; }
    .cell-desc { color: #64748b; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .col-actions { width: 100px; text-align: right; }
    .perm-count { background: #e0e7ff; color: #3b82f6; font-size: 0.78rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
    .badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
    .badge.built-in { background: #f0f4f8; color: #64748b; }

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
    .form-input:disabled { background: #f8fafc; color: #94a3b8; }

    .perm-section { margin-top: 8px; }
    .perm-section h4 { margin: 0 0 12px; font-size: 0.88rem; color: #1a2332; }
    .perm-grid {
      display: grid;
      grid-template-columns: 140px repeat(4, 1fr);
      gap: 4px;
      font-size: 0.8rem;
    }
    .perm-header { text-align: center; font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 0.72rem; letter-spacing: .4px; padding: 4px 0; }
    .perm-resource { padding: 6px 0; font-weight: 600; color: #334155; text-transform: capitalize; }
    .perm-cell { display: flex; align-items: center; justify-content: center; }
    .perm-cell input[type='checkbox'] { width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer; }

    .panel-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 200; }
    .modal-card { background: #fff; border-radius: 14px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
    .modal-card h3 { margin: 0 0 8px; font-size: 1.1rem; }
    .modal-card p { margin: 0 0 20px; color: #64748b; font-size: 0.9rem; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
  `],
})
export class RolesComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly resources = RESOURCES;
  protected readonly actions = ACTIONS;

  protected readonly roles = signal<Role[]>([]);
  protected readonly filterName = signal('');
  protected readonly filterDescription = signal('');
  protected readonly sortField = signal<SortField | ''>('');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<Role | null>(null);
  protected readonly deleteTarget = signal<Role | null>(null);

  protected formName = '';
  protected formDesc = '';
  protected formPermissions = signal<Set<string>>(new Set());

  protected readonly filteredRoles = computed(() => {
    const name = this.filterName().toLowerCase();
    const desc = this.filterDescription().toLowerCase();
    return this.roles().filter((r) =>
      (!name || r.name.toLowerCase().includes(name)) &&
      (!desc || (r.description ?? '').toLowerCase().includes(desc))
    );
  });

  protected readonly sortedRoles = computed(() => {
    const items = this.filteredRoles();
    const field = this.sortField();
    const dir = this.sortDir();
    if (!field) return items;
    const sorted = [...items].sort((a, b) => {
      if (field === 'permissions') return a.permissions.length - b.permissions.length;
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
    this.load();
  }

  private load() {
    this.api.getRoles().subscribe((res: any) => this.roles.set(res.data));
  }

  private permKey(resource: string, action: string) {
    return `${resource}:${action}`;
  }

  protected hasPermission(resource: string, action: string): boolean {
    return this.formPermissions().has(this.permKey(resource, action));
  }

  protected togglePermission(resource: string, action: string) {
    const perms = new Set(this.formPermissions());
    const key = this.permKey(resource, action);
    if (perms.has(key)) {
      perms.delete(key);
    } else {
      perms.add(key);
    }
    this.formPermissions.set(perms);
  }

  protected openCreate() {
    this.editing.set(null);
    this.formName = '';
    this.formDesc = '';
    this.formPermissions.set(new Set());
    this.panelOpen.set(true);
  }

  protected openEdit(r: Role) {
    this.editing.set(r);
    this.formName = r.name;
    this.formDesc = r.description ?? '';
    const perms = new Set(r.permissions.map((p) => this.permKey(p.resource, p.action)));
    this.formPermissions.set(perms);
    this.panelOpen.set(true);
  }

  protected save() {
    const permissions: { resource: string; action: string }[] = Array.from(this.formPermissions()).map((k) => {
      const parts = k.split(':');
      return { resource: parts[0]!, action: parts[1]! };
    });
    const payload: { name: string; description?: string; permissions: { resource: string; action: string }[] } = {
      name: this.formName,
      ...(this.formDesc ? { description: this.formDesc } : {}),
      permissions,
    };
    const edit = this.editing();

    const req = edit
      ? this.api.updateRole(edit.id, payload)
      : this.api.createRole(payload);

    req.subscribe(() => {
      this.panelOpen.set(false);
      this.load();
    });
  }

  protected confirmDelete(r: Role) {
    this.deleteTarget.set(r);
  }

  protected doDelete() {
    const t = this.deleteTarget();
    if (!t) return;
    this.api.deleteRole(t.id).subscribe(() => {
      this.deleteTarget.set(null);
      this.load();
    });
  }
}
