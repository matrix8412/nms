import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';
import { HostFormComponent } from './host-form.component';
import type { DeviceDto } from '@nms/shared';

@Component({
  selector: 'app-host-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SlidePanelComponent, HostFormComponent],
  template: `
    <div class="page-header">
      <div class="breadcrumb">
        <a routerLink="/hosts" class="back-link">
          <span class="material-icons">arrow_back</span>
          Hosts
        </a>
        <span class="separator">/</span>
        <span class="current">{{ host()?.name || 'Loading...' }}</span>
      </div>
      <button *ngIf="host()" class="btn btn-primary" (click)="editPanelOpen.set(true)">
        <span class="material-icons">edit</span>
        Edit
      </button>
    </div>

    <div class="detail-grid" *ngIf="host()">
      <!-- Info Card -->
      <div class="info-card">
        <div class="card-title">
          <span class="material-icons">dns</span>
          Host Information
        </div>
        <div class="info-rows">
          <div class="info-row">
            <span class="info-label">Name</span>
            <span class="info-value">{{ host()!.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">IP Address</span>
            <span class="info-value mono">{{ host()!.ip }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vendor</span>
            <span class="info-value">{{ host()!.vendor || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type</span>
            <span class="info-value">
              <span class="type-badge" *ngIf="host()!.type">{{ host()!.type }}</span>
              <span *ngIf="!host()!.type">—</span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Zabbix Host ID</span>
            <span class="info-value mono">{{ host()!.zabbixHostId || 'Not linked' }}</span>
          </div>
        </div>
      </div>

      <!-- Metrics Card -->
      <div class="info-card">
        <div class="card-title">
          <span class="material-icons">show_chart</span>
          Recent Metrics
        </div>
        <div class="table-wrap" *ngIf="metrics().length > 0">
          <table>
            <thead>
              <tr>
                <th>Item Key</th>
                <th>Value</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of metrics()">
                <td class="mono">{{ m.itemKey }}</td>
                <td>{{ m.valueNumeric ?? m.valueText ?? '—' }}</td>
                <td class="mono">{{ m.recordedAt | date:'short' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="empty-state" *ngIf="metrics().length === 0">
          <span class="material-icons">info</span>
          <p>No metrics collected yet.</p>
        </div>
      </div>
    </div>

    <div class="loading" *ngIf="!host() && !error()">Loading host details...</div>
    <div class="error-state" *ngIf="error()">{{ error() }}</div>

    <!-- Edit panel -->
    <app-slide-panel
      [isOpen]="editPanelOpen()"
      title="Edit Host"
      (close)="editPanelOpen.set(false)"
    >
      <app-host-form
        *ngIf="editPanelOpen() && host()"
        [host]="host()"
        (saved)="onSaved()"
        (cancelled)="editPanelOpen.set(false)"
      />
    </app-slide-panel>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.92rem;
      }
      .back-link {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #3b82f6;
        text-decoration: none;
        font-weight: 600;
      }
      .back-link:hover { text-decoration: underline; }
      .back-link .material-icons { font-size: 18px; }
      .separator { color: #94a3b8; }
      .current { font-weight: 600; color: #1a2332; }

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
        font-family: inherit;
      }
      .btn .material-icons { font-size: 18px; }
      .btn-primary { background: #3b82f6; color: #fff; }
      .btn-primary:hover { background: #2563eb; }

      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      @media (max-width: 900px) {
        .detail-grid { grid-template-columns: 1fr; }
      }

      .info-card {
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
        font-weight: 700;
        font-size: 0.95rem;
        color: #1a2332;
      }
      .card-title .material-icons { color: #3b82f6; font-size: 20px; }

      .info-rows { padding: 4px 0; }
      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 20px;
        border-bottom: 1px solid #f1f5f9;
      }
      .info-row:last-child { border-bottom: none; }
      .info-label { font-size: 0.84rem; color: #64748b; font-weight: 500; }
      .info-value { font-size: 0.88rem; color: #1a2332; font-weight: 600; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }

      .type-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 0.78rem;
        font-weight: 600;
      }

      /* Metrics table */
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
      td {
        padding: 10px 16px;
        font-size: 0.86rem;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px;
        color: #94a3b8;
        gap: 8px;
      }
      .empty-state .material-icons { font-size: 32px; }
      .empty-state p { margin: 0; font-size: 0.88rem; }

      .loading, .error-state {
        text-align: center;
        padding: 40px;
        color: #64748b;
      }
      .error-state { color: #dc2626; }
    `,
  ],
})
export class HostDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  protected readonly host = signal<DeviceDto | null>(null);
  protected readonly metrics = signal<Array<{
    itemKey: string;
    valueNumeric: number | null;
    valueText: string | null;
    recordedAt: string;
  }>>([]);
  protected readonly editPanelOpen = signal(false);
  protected readonly error = signal('');

  ngOnInit() {
    this.loadHost();
  }

  private loadHost() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/hosts']);
      return;
    }
    this.api.getDevice(id).subscribe({
      next: (res) => {
        this.host.set(res.data);
        this.metrics.set((res.data.metrics ?? []) as Array<{
          itemKey: string;
          valueNumeric: number | null;
          valueText: string | null;
          recordedAt: string;
        }>);
      },
      error: () => this.error.set('Host not found'),
    });
  }

  protected onSaved() {
    this.editPanelOpen.set(false);
    this.loadHost();
  }
}
