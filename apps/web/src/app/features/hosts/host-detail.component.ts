import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';
import {
  TimeSeriesChartComponent,
  type TimeSeriesChartPoint,
  type TimeSeriesChartRangeOption,
  type TimeSeriesChartSeries,
} from '../../core/layout/time-series-chart.component';
import { HostFormComponent } from './host-form.component';
import type { DeviceDto } from '@nms/shared';

@Component({
  selector: 'app-host-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SlidePanelComponent, HostFormComponent, TimeSeriesChartComponent],
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

    <div class="detail-tabs" *ngIf="host()">
      <button type="button" class="detail-tab" [class.active]="activeTab() === 'overview'" (click)="activeTab.set('overview')">
        Overview
      </button>
      <button type="button" class="detail-tab" [class.active]="activeTab() === 'interfaces'" (click)="activeTab.set('interfaces')">
        Interfaces
        <span class="detail-tab-count">{{ host()!.snmpInterfaces?.length || 0 }}</span>
      </button>
    </div>

    <div class="detail-grid" *ngIf="host() && activeTab() === 'overview'">
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
            <span class="info-label">Site</span>
            <span class="info-value">{{ host()!.site?.name || 'â€”' }}</span>
          </div>
          <div class="info-row" *ngIf="host()!.site">
            <span class="info-label">Site Address</span>
            <span class="info-value">{{ formatSiteAddress() }}</span>
          </div>
          <div class="info-row" *ngIf="host()!.site">
            <span class="info-label">Coordinates</span>
            <span class="info-value mono">{{ host()!.site!.latitude.toFixed(6) }}, {{ host()!.site!.longitude.toFixed(6) }}</span>
          </div>
          <div class="info-row" *ngIf="host()!.site?.description">
            <span class="info-label">Site Description</span>
            <span class="info-value">{{ host()!.site!.description }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Zabbix Host ID</span>
            <span class="info-value mono">{{ host()!.zabbixHostId || 'Not linked' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">SNMP Status</span>
            <span class="info-value">
              <span class="status-badge"
                    [class.status-up]="host()!.snmpStatus === 'UP'"
                    [class.status-down]="host()!.snmpStatus === 'DOWN'"
                    [class.status-unknown]="host()!.snmpStatus === 'UNKNOWN'">
                <span class="status-dot"></span>
                {{ host()!.snmpStatus }}
              </span>
              <span class="ping-info" *ngIf="host()!.snmp?.version">
                {{ host()!.snmp?.version }} / {{ host()!.snmp?.port }}
              </span>
            </span>
          </div>
          <div class="info-row" *ngIf="host()!.snmpHostname">
            <span class="info-label">SNMP Hostname</span>
            <span class="info-value">{{ host()!.snmpHostname }}</span>
          </div>
          <div class="info-row" *ngIf="host()!.snmpSoftwareVersion">
            <span class="info-label">Software Version</span>
            <span class="info-value">{{ host()!.snmpSoftwareVersion }}</span>
          </div>
          <div class="info-row" *ngIf="host()!.snmpUptimeTicks != null">
            <span class="info-label">SNMP Uptime</span>
            <span class="info-value">{{ formatSnmpUptime(host()!.snmpUptimeTicks!) }}</span>
          </div>
          <div class="info-row" *ngIf="host()!.snmpLastSyncAt">
            <span class="info-label">Last SNMP Sync</span>
            <span class="info-value">{{ host()!.snmpLastSyncAt | date:'medium' }}</span>
          </div>
          <div class="info-row" *ngIf="host()!.snmpLastError">
            <span class="info-label">SNMP Error</span>
            <span class="info-value">{{ host()!.snmpLastError }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ICMP Status</span>
            <span class="info-value">
              <span class="status-badge"
                    [class.status-up]="host()!.icmpStatus === 'UP'"
                    [class.status-down]="host()!.icmpStatus === 'DOWN'"
                    [class.status-unknown]="host()!.icmpStatus === 'UNKNOWN'">
                <span class="status-dot"></span>
                {{ host()!.icmpStatus }}
              </span>
              <span class="ping-info" *ngIf="host()!.lastPingDuration != null">
                {{ host()!.lastPingDuration }} ms
              </span>
            </span>
          </div>
          <div class="info-row" *ngIf="host()!.lastPingAt">
            <span class="info-label">Last Ping</span>
            <span class="info-value">{{ host()!.lastPingAt | date:'medium' }}</span>
          </div>
        </div>
      </div>

      <div class="info-card">
        <div class="card-title">
          <span class="material-icons">show_chart</span>
          Recent Metrics
        </div>
        <app-time-series-chart
          title="ICMP History"
          subtitle="Solid-line trend view with MRTG-style legend for packet loss and response"
          [points]="icmpChartData()"
          [series]="icmpChartSeries"
          [ranges]="icmpChartRanges"
          emptyText="No ICMP history collected yet."
        />

      </div>
    </div>

    <div class="info-card interfaces-card" *ngIf="host() && activeTab() === 'interfaces'">
        <div class="card-title">
          <span class="material-icons">lan</span>
          Network Interfaces
        </div>
        <div class="table-wrap" *ngIf="host()!.snmpInterfaces?.length; else emptyInterfacesState">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Description</th>
                <th>MAC</th>
                <th>Oper State</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of host()!.snmpInterfaces || []">
                <td class="mono">{{ item.index }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.description || '—' }}</td>
                <td class="mono">{{ item.mac || '—' }}</td>
                <td>
                  <span class="status-badge"
                        [class.status-up]="item.operStatus === 'up'"
                        [class.status-down]="item.operStatus === 'down'"
                        [class.status-unknown]="item.operStatus !== 'up' && item.operStatus !== 'down'">
                    <span class="status-dot"></span>
                    {{ item.operStatus || 'unknown' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #emptyInterfacesState>
          <div class="empty-state">
            <span class="material-icons">lan</span>
            <p>No interfaces discovered yet.</p>
          </div>
        </ng-template>
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
      .detail-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }
      .detail-tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 1px solid #dbe4ee;
        border-radius: 999px;
        background: #fff;
        color: #475569;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }
      .detail-tab.active {
        background: #0f172a;
        border-color: #0f172a;
        color: #fff;
      }
      .detail-tab-count {
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.18);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.78rem;
      }
      .detail-tab.active .detail-tab-count {
        background: rgba(255, 255, 255, 0.16);
      }
      @media (max-width: 900px) {
        .detail-grid { grid-template-columns: 1fr; }
        .detail-tabs { flex-wrap: wrap; }
      }

      .info-card {
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .interfaces-card {
        grid-column: 1 / -1;
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

      /* Status badge */
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        background: #f1f5f9;
        color: #94a3b8;
      }
      .status-badge .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }
      .status-badge.status-up { background: #dcfce7; color: #16a34a; }
      .status-badge.status-down { background: #fef2f2; color: #dc2626; }
      .status-badge.status-unknown { background: #f1f5f9; color: #94a3b8; }
      .ping-info {
        margin-left: 8px;
        font-size: 0.82rem;
        color: #64748b;
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
  protected readonly icmpHistory = signal<Array<{
    recordedAt: string;
    status: 'UP' | 'DOWN';
    rttMs: number | null;
    packetLossPercent: number | null;
  }>>([]);
  protected readonly activeTab = signal<'overview' | 'interfaces'>('overview');
  protected readonly editPanelOpen = signal(false);
  protected readonly error = signal('');
  protected readonly icmpChartData = computed<TimeSeriesChartPoint[]>(() => {
    return this.icmpHistory().map((point) => ({
      timestamp: point.recordedAt,
      values: {
        packetLoss: point.packetLossPercent,
        responseTime: point.rttMs,
      },
    }));
  });
  protected readonly icmpChartSeries: TimeSeriesChartSeries[] = [
    {
      key: 'packetLoss',
      label: 'Packet loss',
      color: '#dc2626',
      axis: 'left',
      unit: '%',
      decimals: 1,
    },
    {
      key: 'responseTime',
      label: 'Response',
      color: '#16a34a',
      axis: 'right',
      unit: 'ms',
      decimals: 1,
    },
  ];
  protected readonly icmpChartRanges: TimeSeriesChartRangeOption[] = [
    { label: '1H', value: '1h', durationMs: 60 * 60 * 1000 },
    { label: '6H', value: '6h', durationMs: 6 * 60 * 60 * 1000 },
    { label: '24H', value: '24h', durationMs: 24 * 60 * 60 * 1000 },
    { label: 'All', value: 'all' },
  ];

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
        this.activeTab.set('overview');
        this.metrics.set((res.data.metrics ?? []) as Array<{
          itemKey: string;
          valueNumeric: number | null;
          valueText: string | null;
          recordedAt: string;
        }>);
        this.icmpHistory.set((res.data.icmpHistory ?? []) as Array<{
          recordedAt: string;
          status: 'UP' | 'DOWN';
          rttMs: number | null;
          packetLossPercent: number | null;
        }>);
      },
      error: () => this.error.set('Host not found'),
    });
  }

  protected onSaved() {
    this.editPanelOpen.set(false);
    this.loadHost();
  }

  protected formatSnmpUptime(ticks: number) {
    const totalSeconds = Math.floor(ticks / 100);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const dayPart = days > 0 ? `${days}d ` : '';
    return `${dayPart}${hours}h ${minutes}m ${seconds}s`.trim();
  }

  protected formatSiteAddress() {
    const site = this.host()?.site;
    if (!site) {
      return '—';
    }

    return `${site.street} ${site.descriptiveNumber}${site.orientationNumber ? `/${site.orientationNumber}` : ''}, ${site.zipNumber} ${site.city}`;
  }
}
