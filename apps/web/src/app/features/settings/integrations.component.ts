import { Component, inject, signal, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';

interface IntegrationConfig {
  id?: string;
  provider: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

interface ModuleDef {
  provider: string;
  label: string;
  icon: string;
  description: string;
  fields: { key: string; label: string; type: 'text' | 'password' | 'url' }[];
}

const MODULES: ModuleDef[] = [
  {
    provider: 'icmp',
    label: 'ICMP Monitoring',
    icon: 'network_ping',
    description: 'Ping devices periodically to monitor availability (UP / DOWN)',
    fields: [
      { key: 'intervalSec', label: 'Ping Interval (seconds)', type: 'text' },
      { key: 'timeoutSec', label: 'Timeout (seconds)', type: 'text' },
      { key: 'retries', label: 'Retries per check', type: 'text' },
    ],
  },
  {
    provider: 'zabbix',
    label: 'Zabbix',
    icon: 'monitoring',
    description: 'Import hosts and metrics from Zabbix monitoring platform',
    fields: [
      { key: 'url', label: 'Zabbix API URL', type: 'url' },
      { key: 'apiToken', label: 'API Token', type: 'password' },
    ],
  },
];

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, SlidePanelComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Integrations</h1>
        <p class="subtitle">Connect external systems to NMS</p>
      </div>
    </div>

    <div class="modules-grid">
      <div class="module-card" *ngFor="let m of modules">
        <div class="module-header">
          <span class="material-icons module-icon">{{ m.icon }}</span>
          <div>
            <div class="module-label">{{ m.label }}</div>
            <div class="module-desc">{{ m.description }}</div>
          </div>
        </div>
        <div class="module-footer">
          <span class="status-badge" [class.enabled]="isEnabled(m.provider)">
            {{ isEnabled(m.provider) ? 'Enabled' : 'Disabled' }}
          </span>
          <button class="btn btn-outline btn-sm" (click)="openConfig(m)">
            <span class="material-icons">settings</span> Configure
          </button>
        </div>
      </div>
    </div>

    <!-- Config panel -->
    <app-slide-panel
      [isOpen]="panelOpen()"
      [title]="editingModule()?.label + ' Configuration'"
      (close)="panelOpen.set(false)"
    >
      <form *ngIf="editingModule() as m" (ngSubmit)="saveConfig()" class="panel-form">
        <label class="form-label toggle-row">
          <span>Enabled</span>
          <input type="checkbox" [(ngModel)]="formEnabled" name="enabled" class="toggle" />
        </label>
        <ng-container *ngFor="let f of m.fields">
          <label class="form-label">
            {{ f.label }}
            <input class="form-input" [type]="f.type === 'password' ? 'password' : 'text'" [name]="f.key"
              [ngModel]="formSettings[f.key] ?? ''" (ngModelChange)="formSettings[f.key] = $event" />
          </label>
        </ng-container>
        <div class="panel-actions">
          <button type="button" class="btn btn-outline" (click)="panelOpen.set(false)">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </app-slide-panel>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

    .modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
    .module-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
    .module-header { display: flex; gap: 14px; padding: 20px; }
    .module-icon { font-size: 36px; color: #3b82f6; flex-shrink: 0; }
    .module-label { font-weight: 700; font-size: 1rem; color: #1a2332; margin-bottom: 4px; }
    .module-desc { font-size: 0.84rem; color: #64748b; line-height: 1.4; }
    .module-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-top: 1px solid #f1f5f9; background: #f8fafc; }

    .status-badge { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; padding: 4px 10px; border-radius: 6px; background: #fee2e2; color: #dc2626; }
    .status-badge.enabled { background: #dcfce7; color: #16a34a; }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: background .15s; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover { background: #2563eb; }
    .btn-outline { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-sm { padding: 6px 12px; font-size: 0.82rem; }
    .btn .material-icons { font-size: 16px; }

    .panel-form { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
    .form-label { display: flex; flex-direction: column; gap: 6px; font-size: 0.84rem; font-weight: 600; color: #334155; }
    .form-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; }
    .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
    .toggle-row { flex-direction: row; align-items: center; justify-content: space-between; }
    .toggle { width: 20px; height: 20px; accent-color: #3b82f6; }
    .panel-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
  `],
})
export class IntegrationsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly modules = MODULES;
  protected readonly configs = signal<Map<string, IntegrationConfig>>(new Map());
  protected readonly panelOpen = signal(false);
  protected readonly editingModule = signal<ModuleDef | null>(null);

  protected formEnabled = false;
  protected formSettings: Record<string, string> = {};

  ngOnInit() {
    this.loadConfigs();
  }

  private loadConfigs() {
    this.api.getIntegrations().subscribe((res: any) => {
      const map = new Map<string, IntegrationConfig>();
      for (const c of res.data) {
        map.set(c.provider, c);
      }
      this.configs.set(map);
    });
  }

  protected isEnabled(provider: string): boolean {
    return this.configs().get(provider)?.enabled ?? false;
  }

  protected openConfig(m: ModuleDef) {
    const cfg = this.configs().get(m.provider);
    this.editingModule.set(m);
    this.formEnabled = cfg?.enabled ?? false;
    this.formSettings = { ...(cfg?.settings as Record<string, string> ?? {}) };
    this.panelOpen.set(true);
  }

  protected saveConfig() {
    const m = this.editingModule();
    if (!m) return;
    this.api.updateIntegration(m.provider, { enabled: this.formEnabled, settings: this.formSettings }).subscribe(() => {
      this.panelOpen.set(false);
      this.loadConfigs();
    });
  }
}
