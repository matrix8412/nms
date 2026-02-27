import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
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
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Created</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users()" class="row-hover">
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
            <tr *ngIf="users().length === 0 && !loading()">
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
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
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
  protected readonly loading = signal(true);
  protected readonly users = signal<UserEntry[]>([]);
  protected readonly panelOpen = signal(false);
  protected readonly editingUser = signal<UserEntry | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.loading.set(true);
    this.api.getAdminUsers().subscribe({
      next: (res) => {
        this.users.set(res.data as UserEntry[]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
