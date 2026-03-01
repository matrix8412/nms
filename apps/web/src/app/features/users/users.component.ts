import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';

interface UserEntry {
  id: string;
  email: string;
  role: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

type SortField = 'email' | 'role' | 'emailVerifiedAt' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface RoleEntry {
  id: string;
  name: string;
  description: string | null;
  builtIn: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, SlidePanelComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Users</h1>
        <p class="subtitle">Manage system users</p>
      </div>
    </div>

    <div class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable" (click)="toggleSort('email')">
                Email
                <span class="sort-icon material-icons">{{ getSortIcon('email') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('role')">
                Role
                <span class="sort-icon material-icons">{{ getSortIcon('role') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('emailVerifiedAt')">
                Verified
                <span class="sort-icon material-icons">{{ getSortIcon('emailVerifiedAt') }}</span>
              </th>
              <th class="sortable" (click)="toggleSort('createdAt')">
                Created
                <span class="sort-icon material-icons">{{ getSortIcon('createdAt') }}</span>
              </th>
              <th class="actions-col">Actions</th>
            </tr>
            <tr class="filter-row">
              <th>
                <input type="text" class="th-filter" placeholder="Search…" [(ngModel)]="filterEmail" (ngModelChange)="applyFilter()" />
              </th>
              <th>
                <select class="th-filter" [(ngModel)]="filterRole" (ngModelChange)="applyFilter()">
                  <option value="">All</option>
                  <option *ngFor="let r of availableRoles()" [value]="r">{{ r }}</option>
                </select>
              </th>
              <th>
                <select class="th-filter" [(ngModel)]="filterVerified" (ngModelChange)="applyFilter()">
                  <option value="">All</option>
                  <option value="yes">Verified</option>
                  <option value="no">Not verified</option>
                </select>
              </th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of sortedUsers()" class="row-hover">
              <td class="user-email">{{ user.email }}</td>
              <td>
                <span class="role-badge" [ngClass]="user.role === 'ADMIN' ? 'admin' : 'user'">
                  {{ user.role }}
                </span>
              </td>
              <td>
                <span class="material-icons verified-icon" [class.yes]="user.emailVerifiedAt">
                  {{ user.emailVerifiedAt ? 'verified' : 'cancel' }}
                </span>
              </td>
              <td class="mono">{{ user.createdAt | date:'mediumDate' }}</td>
              <td class="actions-col">
                <button class="icon-btn" title="Edit" (click)="openEditPanel(user)">
                  <span class="material-icons">edit</span>
                </button>
              </td>
            </tr>
            <tr *ngIf="sortedUsers().length === 0 && !loading()">
              <td colspan="5" class="empty">No users found.</td>
            </tr>
            <tr *ngIf="loading()">
              <td colspan="5" class="empty">Loading...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit User Panel -->
    <app-slide-panel
      [isOpen]="panelOpen()"
      title="Edit User"
      (close)="closePanel()"
    >
      <div *ngIf="editingUser()" class="form">
        <div class="form-group">
          <label>Email</label>
          <input type="text" [value]="editingUser()!.email" disabled />
        </div>

        <div class="form-group">
          <label>Role</label>
          <select [(ngModel)]="editRole" class="select-input">
            <option *ngFor="let role of roles()" [value]="role.name">{{ role.name }}</option>
          </select>
        </div>

        <div class="form-error" *ngIf="error()">{{ error() }}</div>

        <div class="form-actions">
          <button class="btn btn-secondary" (click)="closePanel()">Cancel</button>
          <button class="btn btn-primary" (click)="saveUser()" [disabled]="submitting()">
            {{ submitting() ? 'Saving...' : 'Update User' }}
          </button>
        </div>
      </div>
    </app-slide-panel>
  `,
  styles: [
    `
      .page-header { margin-bottom: 20px; }
      .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
      .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

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
      .filter-row th { padding: 6px 16px 10px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
      .th-filter { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #fff; outline: none; color: #334155; box-sizing: border-box; }
      .th-filter:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
      select.th-filter { cursor: pointer; }

      td {
        padding: 12px 16px;
        font-size: 0.86rem;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
      }
      .row-hover:hover { background: #f8fafc; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }
      .actions-col { text-align: right; }
      .user-email { font-weight: 600; }

      .role-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .role-badge.admin { background: #ede9fe; color: #7c3aed; }
      .role-badge.user { background: #e0f2fe; color: #0369a1; }

      .verified-icon { font-size: 20px; color: #cbd5e1; }
      .verified-icon.yes { color: #22c55e; }

      .icon-btn {
        border: none;
        background: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        color: #64748b;
      }
      .icon-btn:hover { background: #f1f5f9; color: #1a2332; }
      .icon-btn .material-icons { font-size: 18px; }

      .empty { text-align: center; color: #94a3b8; padding: 32px 16px !important; }

      /* Form in slide panel */
      .form { display: flex; flex-direction: column; gap: 18px; }
      .form-group { display: flex; flex-direction: column; gap: 6px; }
      .form-group label { font-size: 0.82rem; font-weight: 600; color: #475569; }
      .form-group input, .select-input {
        padding: 10px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.88rem;
        font-family: inherit;
        outline: none;
      }
      .form-group input:disabled { background: #f8fafc; color: #94a3b8; }
      .select-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

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
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.88rem;
        cursor: pointer;
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
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected editRole = 'USER';
  protected filterEmail = '';
  protected filterRole = '';
  protected filterVerified = '';
  protected readonly loading = signal(true);
  protected readonly users = signal<UserEntry[]>([]);
  protected readonly roles = signal<RoleEntry[]>([]);
  protected readonly filteredUsers = signal<UserEntry[]>([]);
  protected readonly availableRoles = signal<string[]>([]);
  protected readonly sortField = signal<SortField | ''>('');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly panelOpen = signal(false);
  protected readonly editingUser = signal<UserEntry | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly sortedUsers = computed(() => {
    const items = this.filteredUsers();
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
    this.loadUsers();
    this.loadRoles();
  }

  private loadRoles() {
    this.api.getRoles().subscribe({
      next: (res) => this.roles.set(res.data as RoleEntry[]),
    });
  }

  private loadUsers() {
    this.loading.set(true);
    this.api.getAdminUsers().subscribe({
      next: (res) => {
        const data = res.data as UserEntry[];
        this.users.set(data);
        this.extractRoles(data);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private extractRoles(users: UserEntry[]) {
    const roles = new Set<string>();
    for (const u of users) roles.add(u.role);
    this.availableRoles.set([...roles].sort());
  }

  protected applyFilter() {
    const email = this.filterEmail.toLowerCase();
    const role = this.filterRole;
    const verified = this.filterVerified;
    this.filteredUsers.set(
      this.users().filter((u) =>
        (!email || u.email.toLowerCase().includes(email)) &&
        (!role || u.role === role) &&
        (!verified || (verified === 'yes' ? !!u.emailVerifiedAt : !u.emailVerifiedAt))
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

  protected openEditPanel(user: UserEntry) {
    this.editingUser.set(user);
    this.editRole = user.role;
    this.error.set('');
    this.panelOpen.set(true);
  }

  protected closePanel() {
    this.panelOpen.set(false);
    this.editingUser.set(null);
  }

  protected saveUser() {
    const user = this.editingUser();
    if (!user) return;
    this.submitting.set(true);
    this.error.set('');

    this.api.updateAdminUser(user.id, { role: this.editRole as 'USER' | 'ADMIN' }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closePanel();
        this.loadUsers();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message || 'Failed to update user');
      },
    });
  }
}
