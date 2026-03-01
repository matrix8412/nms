import { Component, inject, signal, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';

interface IcmpSettings {
  enabled: boolean;
  intervalSec: number;
  timeoutSec: number;
  retries: number;
}

const ICMP_DEFAULTS: IcmpSettings = {
  enabled: true,
  intervalSec: 120,
  timeoutSec: 3,
  retries: 1,
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Settings</h1>
      <p class="subtitle">System configuration</p>
    </div>

    <div class="settings-grid">
      <!-- General info (read-only) -->
      <div class="settings-card">
        <div class="card-title">
          <span class="material-icons">tune</span>
          General
        </div>
        <div class="setting-row">
          <div>
            <span class="setting-label">System Name</span>
            <span class="setting-desc">The name displayed in the header</span>
          </div>
          <span class="setting-value">NMS</span>
        </div>
        <div class="setting-row">
          <div>
            <span class="setting-label">Version</span>
            <span class="setting-desc">Current application version</span>
          </div>
          <span class="setting-value mono">1.0.0</span>
        </div>
      </div>

      <!-- ICMP Monitoring -->
      <div class="settings-card">
        <div class="card-title">
          <span class="material-icons">network_ping</span>
          ICMP Monitoring
          <span class="title-badge" [class.enabled]="icmp.enabled">
            {{ icmp.enabled ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
        <div class="setting-row">
          <div>
            <span class="setting-label">Enable ICMP Ping</span>
            <span class="setting-desc">Periodically ping all hosts from the server to check reachability</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" [(ngModel)]="icmp.enabled" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row" [class.disabled-row]="!icmp.enabled">
          <div>
            <span class="setting-label">Ping Interval</span>
            <span class="setting-desc">How often each device is pinged (seconds)</span>
          </div>
          <div class="input-group">
            <input type="number" class="setting-input" [(ngModel)]="icmp.intervalSec"
                   [disabled]="!icmp.enabled" min="10" max="3600" step="10" />
            <span class="input-suffix">sec</span>
          </div>
        </div>
        <div class="setting-row" [class.disabled-row]="!icmp.enabled">
          <div>
            <span class="setting-label">Timeout</span>
            <span class="setting-desc">Max wait time for a ping response before marking host DOWN</span>
          </div>
          <div class="input-group">
            <input type="number" class="setting-input" [(ngModel)]="icmp.timeoutSec"
                   [disabled]="!icmp.enabled" min="1" max="30" step="1" />
            <span class="input-suffix">sec</span>
          </div>
        </div>
        <div class="setting-row" [class.disabled-row]="!icmp.enabled">
          <div>
            <span class="setting-label">Retries</span>
            <span class="setting-desc">Number of retry attempts before marking host DOWN</span>
          </div>
          <input type="number" class="setting-input" [(ngModel)]="icmp.retries"
                 [disabled]="!icmp.enabled" min="1" max="10" step="1" />
        </div>
        <div class="card-actions">
          <span class="save-status" *ngIf="saveSuccess()">
            <span class="material-icons">check_circle</span> Saved
          </span>
          <button class="btn btn-primary" (click)="saveIcmp()" [disabled]="saving()">
            <span class="material-icons">save</span>
            {{ saving() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>

      <!-- Zabbix Integration (read-only summary) -->
      <div class="settings-card">
        <div class="card-title">
          <span class="material-icons">sync</span>
          Zabbix Integration
        </div>
        <div class="setting-row">
          <div>
            <span class="setting-label">Auto Sync</span>
            <span class="setting-desc">Automatically sync metrics from Zabbix</span>
          </div>
          <span class="setting-value">Enabled</span>
        </div>
        <div class="setting-row">
          <div>
            <span class="setting-label">Sync Interval</span>
            <span class="setting-desc">How often device metrics are synced</span>
          </div>
          <span class="setting-value mono">5 min</span>
        </div>
      </div>

      <!-- Database (read-only) -->
      <div class="settings-card">
        <div class="card-title">
          <span class="material-icons">storage</span>
          Database
        </div>
        <div class="setting-row">
          <div>
            <span class="setting-label">Provider</span>
            <span class="setting-desc">Database engine</span>
          </div>
          <span class="setting-value">PostgreSQL + TimescaleDB</span>
        </div>
        <div class="setting-row">
          <div>
            <span class="setting-label">Metrics Retention</span>
            <span class="setting-desc">How long metric data is stored</span>
          </div>
          <span class="setting-value mono">90 days</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header { margin-bottom: 24px; }
      .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
      .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

      .settings-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .settings-card {
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

      .title-badge {
        margin-left: auto;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        padding: 3px 10px;
        border-radius: 6px;
        background: #fee2e2;
        color: #dc2626;
      }
      .title-badge.enabled { background: #dcfce7; color: #16a34a; }

      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid #f1f5f9;
        transition: opacity 0.2s;
      }
      .setting-row:last-child { border-bottom: none; }
      .setting-row.disabled-row { opacity: 0.45; pointer-events: none; }
      .setting-label { display: block; font-size: 0.88rem; font-weight: 600; color: #1a2332; }
      .setting-desc { display: block; font-size: 0.8rem; color: #94a3b8; margin-top: 2px; }
      .setting-value { font-size: 0.86rem; color: #475569; font-weight: 500; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }

      /* Toggle switch */
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: #cbd5e1;
        border-radius: 24px;
        transition: background 0.2s;
      }
      .toggle-slider::before {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        left: 3px;
        bottom: 3px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s;
      }
      .toggle-switch input:checked + .toggle-slider { background: #3b82f6; }
      .toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }

      /* Number inputs */
      .input-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .setting-input {
        width: 80px;
        padding: 6px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.86rem;
        font-family: 'JetBrains Mono', monospace;
        text-align: right;
        color: #334155;
        background: #fff;
      }
      .setting-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      .setting-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
      .input-suffix { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }

      /* Card actions */
      .card-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        padding: 14px 20px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.86rem;
        cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s;
        font-family: inherit;
      }
      .btn .material-icons { font-size: 16px; }
      .btn-primary { background: #3b82f6; color: #fff; }
      .btn-primary:hover { background: #2563eb; box-shadow: 0 2px 8px rgba(59,130,246,0.25); }
      .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; box-shadow: none; }

      .save-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.82rem;
        color: #16a34a;
        font-weight: 600;
        animation: fadeIn 0.3s ease;
      }
      .save-status .material-icons { font-size: 16px; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `,
  ],
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected icmp: IcmpSettings = { ...ICMP_DEFAULTS };
  protected readonly saving = signal(false);
  protected readonly saveSuccess = signal(false);

  ngOnInit() {
    this.loadIcmpConfig();
  }

  private loadIcmpConfig() {
    this.api.getIntegration('icmp').subscribe({
      next: (res: any) => {
        const cfg = res.data;
        this.icmp.enabled = cfg.enabled ?? ICMP_DEFAULTS.enabled;
        const s = (cfg.settings ?? {}) as Record<string, unknown>;
        this.icmp.intervalSec = typeof s['intervalSec'] === 'number' ? s['intervalSec'] : ICMP_DEFAULTS.intervalSec;
        this.icmp.timeoutSec = typeof s['timeoutSec'] === 'number' ? s['timeoutSec'] : ICMP_DEFAULTS.timeoutSec;
        this.icmp.retries = typeof s['retries'] === 'number' ? s['retries'] : ICMP_DEFAULTS.retries;
      },
    });
  }

  protected saveIcmp() {
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.api.updateIntegration('icmp', {
      enabled: this.icmp.enabled,
      settings: {
        intervalSec: this.icmp.intervalSec,
        timeoutSec: this.icmp.timeoutSec,
        retries: this.icmp.retries,
      },
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: () => this.saving.set(false),
    });
  }
}
