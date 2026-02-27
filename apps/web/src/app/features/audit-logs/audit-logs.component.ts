import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';

interface AuditEntry {
  id: string;
  action: string;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  meta: unknown;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Audit Logs</h1>
        <p class="subtitle">Security and activity history</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="search-box">
        <span class="material-icons search-icon">search</span>
        <input
          type="text"
          placeholder="Filter by action..."
          [(ngModel)]="actionFilter"
          (ngModelChange)="applyFilter()"
        />
      </div>
      <div class="filter-chips">
        <button
          class="chip"
          [class.active]="actionFilter === ''"
          (click)="actionFilter = ''; applyFilter()"
        >All</button>
        <button
          *ngFor="let a of actionTypes()"
          class="chip"
          [class.active]="actionFilter === a"
          (click)="actionFilter = a; applyFilter()"
        >{{ a }}</button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>IP Address</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of filteredLogs()" class="row-hover">
              <td>
                <span class="badge" [ngClass]="getBadgeClass(entry.action)">{{ entry.action }}</span>
              </td>
              <td>{{ entry.userEmail || 'System' }}</td>
              <td class="mono">{{ entry.ip || '—' }}</td>
              <td class="mono">{{ entry.createdAt | date:'medium' }}</td>
            </tr>
            <tr *ngIf="filteredLogs().length === 0 && !loading()">
              <td colspan="4" class="empty">No audit logs found.</td>
            </tr>
            <tr *ngIf="loading()">
              <td colspan="4" class="empty">Loading...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" *ngIf="totalPages() > 1">
        <button class="page-btn" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">
          <span class="material-icons">chevron_left</span>
        </button>
        <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
        <button class="page-btn" [disabled]="page() >= totalPages()" (click)="goToPage(page() + 1)">
          <span class="material-icons">chevron_right</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header { margin-bottom: 20px; }
      .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
      .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

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
        min-width: 200px;
        max-width: 300px;
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
      .chip.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

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
      .empty { text-align: center; color: #94a3b8; padding: 32px 16px !important; }

      .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .badge-blue { background: #e0f2fe; color: #0369a1; }
      .badge-green { background: #dcfce7; color: #15803d; }
      .badge-red { background: #fef2f2; color: #dc2626; }
      .badge-yellow { background: #fef9c3; color: #a16207; }
      .badge-gray { background: #f1f5f9; color: #475569; }

      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 12px;
        border-top: 1px solid #e2e8f0;
      }
      .page-btn {
        border: 1px solid #e2e8f0;
        background: #fff;
        border-radius: 8px;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        color: #475569;
      }
      .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .page-btn:hover:not(:disabled) { background: #f1f5f9; }
      .page-info { font-size: 0.84rem; color: #64748b; }
    `,
  ],
})
export class AuditLogsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected actionFilter = '';
  protected readonly loading = signal(true);
  protected readonly logs = signal<AuditEntry[]>([]);
  protected readonly filteredLogs = signal<AuditEntry[]>([]);
  protected readonly actionTypes = signal<string[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  private readonly perPage = 25;

  ngOnInit() {
    this.loadLogs();
  }

  private loadLogs() {
    this.loading.set(true);
    this.api.getAuditLogs(this.page(), this.perPage).subscribe({
      next: (res) => {
        this.logs.set(res.data);
        this.totalPages.set(res.totalPages ?? 1);
        this.extractActionTypes(res.data);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => {
        this.logs.set([]);
        this.filteredLogs.set([]);
        this.loading.set(false);
      },
    });
  }

  private extractActionTypes(entries: AuditEntry[]) {
    const types = new Set<string>();
    for (const e of entries) types.add(e.action);
    this.actionTypes.set([...types].sort());
  }

  protected applyFilter() {
    const filter = this.actionFilter.toLowerCase();
    this.filteredLogs.set(
      filter ? this.logs().filter((l) => l.action.toLowerCase().includes(filter)) : this.logs(),
    );
  }

  protected goToPage(p: number) {
    this.page.set(p);
    this.loadLogs();
  }

  protected getBadgeClass(action: string): string {
    const lower = action.toLowerCase();
    if (lower.includes('login') || lower.includes('register')) return 'badge-green';
    if (lower.includes('logout') || lower.includes('delete')) return 'badge-red';
    if (lower.includes('update') || lower.includes('change')) return 'badge-yellow';
    if (lower.includes('create') || lower.includes('add')) return 'badge-blue';
    return 'badge-gray';
  }
}
