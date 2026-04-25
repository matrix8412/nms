import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { ColumnFilterTriggerComponent } from '../../core/layout/column-filter-trigger.component';
import { SearchableSelectComponent, type SearchableSelectOption } from '../../core/layout/searchable-select.component';

interface AuditEntry {
  id: string;
  action: string;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  meta: unknown;
}

type SortField = 'action' | 'userEmail' | 'ip' | 'createdAt';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent, ColumnFilterTriggerComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Audit Logs</h1>
        <p class="subtitle">Security and activity history</p>
      </div>
    </div>

    <div class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('action')">
                    Action
                    <span class="sort-icon material-icons">{{ getSortIcon('action') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!actionFilter" label="Filter action">
                    <app-searchable-select
                      [(ngModel)]="actionFilter"
                      (ngModelChange)="applyFilter()"
                      [ngModelOptions]="{ standalone: true }"
                      [options]="actionOptions()"
                      placeholder="All"
                      searchPlaceholder="Search action"
                      emptyOptionLabel="All"
                      emptyStateLabel="No matching actions"
                      [compact]="true"
                    />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('userEmail')">
                    User
                    <span class="sort-icon material-icons">{{ getSortIcon('userEmail') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!userFilter" label="Filter user">
                    <input type="text" class="th-filter" placeholder="Search..." [(ngModel)]="userFilter" (ngModelChange)="applyFilter()" />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('ip')">
                    IP Address
                    <span class="sort-icon material-icons">{{ getSortIcon('ip') }}</span>
                  </button>
                  <app-column-filter-trigger [active]="!!ipFilter" label="Filter IP address">
                    <input type="text" class="th-filter" placeholder="Search..." [(ngModel)]="ipFilter" (ngModelChange)="applyFilter()" />
                  </app-column-filter-trigger>
                </div>
              </th>
              <th class="sortable">
                <div class="header-cell">
                  <button type="button" class="header-sort" (click)="toggleSort('createdAt')">
                    Timestamp
                    <span class="sort-icon material-icons">{{ getSortIcon('createdAt') }}</span>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of sortedLogs()" class="row-hover">
              <td>
                <span class="badge" [ngClass]="getBadgeClass(entry.action)">{{ entry.action }}</span>
              </td>
              <td>{{ entry.userEmail || 'System' }}</td>
              <td class="mono">{{ entry.ip || '—' }}</td>
              <td class="mono">{{ entry.createdAt | date:'medium' }}</td>
            </tr>
            <tr *ngIf="sortedLogs().length === 0 && !loading()">
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
      .header-sort { display: inline-flex; align-items: center; gap: 2px; padding: 0; border: none; background: none; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
      .header-sort:hover { color: #334155; }
      .sort-icon { font-size: 14px; vertical-align: middle; margin-left: 2px; color: #94a3b8; }
      th.sortable:hover .sort-icon, .header-sort:hover .sort-icon { color: #64748b; }
      .th-filter { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #fff; outline: none; color: #334155; box-sizing: border-box; }
      .th-filter:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }

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
  protected userFilter = '';
  protected ipFilter = '';
  protected readonly loading = signal(true);
  protected readonly logs = signal<AuditEntry[]>([]);
  protected readonly filteredLogs = signal<AuditEntry[]>([]);
  protected readonly actionTypes = signal<string[]>([]);
  protected readonly actionOptions = computed<SearchableSelectOption[]>(() =>
    this.actionTypes().map((action) => ({ value: action, label: action })),
  );
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly sortField = signal<SortField | ''>('');
  protected readonly sortDir = signal<SortDir>('asc');

  private readonly perPage = 25;

  protected readonly sortedLogs = computed(() => {
    const items = this.filteredLogs();
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
    const action = this.actionFilter.toLowerCase();
    const user = this.userFilter.toLowerCase();
    const ip = this.ipFilter.toLowerCase();
    this.filteredLogs.set(
      this.logs().filter((l) =>
        (!action || l.action.toLowerCase().includes(action)) &&
        (!user || (l.userEmail ?? '').toLowerCase().includes(user)) &&
        (!ip || (l.ip ?? '').toLowerCase().includes(ip))
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
