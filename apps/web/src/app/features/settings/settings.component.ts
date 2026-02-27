import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>Settings</h1>
      <p class="subtitle">System configuration</p>
    </div>

    <div class="settings-grid">
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

      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid #f1f5f9;
      }
      .setting-row:last-child { border-bottom: none; }
      .setting-label { display: block; font-size: 0.88rem; font-weight: 600; color: #1a2332; }
      .setting-desc { display: block; font-size: 0.8rem; color: #94a3b8; margin-top: 2px; }
      .setting-value { font-size: 0.86rem; color: #475569; font-weight: 500; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }
    `,
  ],
})
export class SettingsComponent {}
