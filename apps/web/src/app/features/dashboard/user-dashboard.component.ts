import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/http/api.service';
import type { DeviceDto } from '@nms/shared';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p class="subtitle">Welcome back, {{ userName() }}</p>
    </div>

    <!-- Summary Cards -->
    <div class="cards-row">
      <div class="summary-card blue">
        <div class="card-info">
          <span class="card-value">{{ totalHosts() }}</span>
          <span class="card-label">Total Hosts</span>
        </div>
        <div class="card-icon-wrap">
          <span class="material-icons">dns</span>
        </div>
      </div>
      <div class="summary-card green">
        <div class="card-info">
          <span class="card-value">{{ hostsUp() }}</span>
          <span class="card-label">Hosts Up</span>
        </div>
        <div class="card-icon-wrap">
          <span class="material-icons">check_circle</span>
        </div>
      </div>
      <div class="summary-card red">
        <div class="card-info">
          <span class="card-value">{{ hostsDown() }}</span>
          <span class="card-label">Hosts Down</span>
        </div>
        <div class="card-icon-wrap">
          <span class="material-icons">error</span>
        </div>
      </div>
      <div class="summary-card teal">
        <div class="card-info">
          <span class="card-value">{{ hostRatio() }}%</span>
          <span class="card-label">Availability</span>
        </div>
        <div class="card-icon-wrap">
          <span class="material-icons">pie_chart</span>
        </div>
      </div>
    </div>

    <!-- Tables Section -->
    <div class="tables-row">
      <!-- Recent Hosts -->
      <div class="table-card">
        <div class="table-header">
          <h2>Recent Hosts</h2>
          <a routerLink="/hosts" class="view-all">View all</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>IP Address</th>
                <th>Vendor</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let host of recentHosts()">
                <td>
                  <span class="status-dot"
                        [class.status-up]="host.icmpStatus === 'UP'"
                        [class.status-down]="host.icmpStatus === 'DOWN'"
                        [class.status-unknown]="host.icmpStatus === 'UNKNOWN'"></span>
                </td>
                <td>
                  <a [routerLink]="['/hosts', host.id]" class="host-link">{{ host.name }}</a>
                </td>
                <td class="mono">{{ host.ip }}</td>
                <td>{{ host.vendor || '—' }}</td>
                <td>{{ host.type || '—' }}</td>
              </tr>
              <tr *ngIf="recentHosts().length === 0">
                <td colspan="5" class="empty">No hosts registered yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Events -->
      <div class="table-card">
        <div class="table-header">
          <h2>Recent Events</h2>
          <a routerLink="/audit-logs" class="view-all">View all</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let event of recentEvents()">
                <td><span class="badge">{{ event.action }}</span></td>
                <td>{{ event.userEmail || '—' }}</td>
                <td class="mono">{{ event.createdAt | date:'short' }}</td>
              </tr>
              <tr *ngIf="recentEvents().length === 0">
                <td colspan="3" class="empty">No events recorded yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 24px;
      }
      .page-header h1 {
        margin: 0 0 4px;
        font-size: 1.5rem;
        font-weight: 700;
        color: #1a2332;
      }
      .subtitle {
        margin: 0;
        color: #64748b;
        font-size: 0.9rem;
      }

      /* Summary Cards */
      .cards-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 28px;
      }
      @media (max-width: 1200px) {
        .cards-row { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 600px) {
        .cards-row { grid-template-columns: 1fr; }
      }

      .summary-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .card-info { display: flex; flex-direction: column; }
      .card-value {
        font-size: 2rem;
        font-weight: 800;
        line-height: 1.1;
      }
      .card-label {
        font-size: 0.82rem;
        font-weight: 500;
        color: #64748b;
        margin-top: 4px;
      }

      .card-icon-wrap {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card-icon-wrap .material-icons { font-size: 26px; color: #fff; }

      .summary-card.blue .card-value { color: #3b82f6; }
      .summary-card.blue .card-icon-wrap { background: #3b82f6; }
      .summary-card.green .card-value { color: #22c55e; }
      .summary-card.green .card-icon-wrap { background: #22c55e; }
      .summary-card.red .card-value { color: #ef4444; }
      .summary-card.red .card-icon-wrap { background: #ef4444; }
      .summary-card.teal .card-value { color: #0ea5e9; }
      .summary-card.teal .card-icon-wrap { background: linear-gradient(135deg, #0ea5e9, #6366f1); }

      /* Tables */
      .tables-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      @media (max-width: 1000px) {
        .tables-row { grid-template-columns: 1fr; }
      }

      .table-card {
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .table-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
      }
      .table-header h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: #1a2332;
      }
      .view-all {
        font-size: 0.82rem;
        color: #3b82f6;
        text-decoration: none;
        font-weight: 600;
      }
      .view-all:hover { text-decoration: underline; }

      .table-wrap { overflow-x: auto; }
      table {
        width: 100%;
        border-collapse: collapse;
      }
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
      tr:last-child td { border-bottom: none; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }
      .host-link {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 600;
      }
      .host-link:hover { text-decoration: underline; }
      .empty {
        text-align: center;
        color: #94a3b8;
        padding: 24px 16px !important;
      }

      .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 0.78rem;
        font-weight: 600;
      }

      /* Status indicators */
      .status-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #94a3b8;
        vertical-align: middle;
      }
      .status-dot.status-up { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.4); }
      .status-dot.status-down { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.4); }
      .status-dot.status-unknown { background: #94a3b8; }
    `,
  ],
})
export class UserDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  protected readonly userName = signal('');
  protected readonly totalHosts = signal(0);
  protected readonly hostsUp = signal(0);
  protected readonly hostsDown = signal(0);
  protected readonly hostRatio = signal(0);
  protected readonly recentHosts = signal<DeviceDto[]>([]);
  protected readonly recentEvents = signal<{ action: string; userEmail: string | null; createdAt: string }[]>([]);

  ngOnInit() {
    const user = this.auth.currentUser();
    this.userName.set(user?.email.split('@')[0] ?? '');

    this.api.getDevices().subscribe({
      next: (res) => {
        const devices = res.data;
        this.totalHosts.set(devices.length);
        const up = devices.filter(d => d.icmpStatus === 'UP').length;
        const down = devices.filter(d => d.icmpStatus === 'DOWN').length;
        this.hostsUp.set(up);
        this.hostsDown.set(down);
        this.hostRatio.set(devices.length > 0 ? Math.round((up / devices.length) * 100) : 0);
        this.recentHosts.set(devices.slice(0, 5));
      },
    });

    this.api.getAuditLogs(1, 5).subscribe({
      next: (res) => this.recentEvents.set(res.data),
      error: () => this.recentEvents.set([]),
    });
  }
}
