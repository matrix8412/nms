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
  fields: { key: string; label: string; type: 'text' | 'password' | 'url' | 'number' }[];
}

const MODULES: ModuleDef[] = [
  {
    provider: 'icmp',
    label: 'ICMP Monitoring',
    icon: 'network_ping',
    description: 'Ping devices periodically to monitor availability (UP / DOWN)',
    fields: [
      { key: 'intervalSec', label: 'Ping Interval (seconds)', type: 'number' },
      { key: 'timeoutSec', label: 'Timeout (seconds)', type: 'number' },
      { key: 'retries', label: 'Retries per check', type: 'number' },
      { key: 'historyRetentionDays', label: 'History Retention (days)', type: 'number' },
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

    <app-slide-panel [isOpen]="panelOpen()" [title]="editingModule() ? editingModule()!.label + ' Configuration' : ''" (close)="panelOpen.set(false)">
      <form *ngIf="editingModule() as m" (ngSubmit)="saveConfig()" class="panel-form">
        <label class="form-label toggle-row">
          <span>Enabled</span>
          <input type="checkbox" [(ngModel)]="formEnabled" name="enabled" class="toggle" />
        </label>
        <ng-container *ngFor="let f of m.fields">
          <label class="form-label">
            {{ f.label }}
            <input class="form-input" [type]="inputType(f.type)" [name]="f.key" [ngModel]="formSettings[f.key] ?? ''" (ngModelChange)="onFieldChange(f, $event)" />
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
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
    .modules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
    .module-card {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 22px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
    }
    .module-header { display: flex; align-items: flex-start; gap: 14px; }
    .module-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: #dbeafe;
      color: #2563eb;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .module-label { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .module-desc { color: #64748b; font-size: 0.9rem; line-height: 1.5; }
    .module-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #fee2e2;
      color: #dc2626;
    }
    .status-badge.enabled { background: #dcfce7; color: #16a34a; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: background .15s; }
    .btn-sm { padding: 7px 14px; font-size: 0.82rem; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover { background: #2563eb; }
    .btn-outline { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
    .btn-outline:hover { background: #f8fafc; }
    .panel-form { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
    .form-label { display: flex; flex-direction: column; gap: 6px; font-size: 0.84rem; font-weight: 600; color: #334155; }
    .form-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; font-family: inherit; }
    .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
    .toggle-row { flex-direction: row; align-items: center; justify-content: space-between; }
    .toggle { width: 18px; height: 18px; accent-color: #2563eb; }
    .panel-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }

    @media (max-width: 640px) {
      .module-card { padding: 18px; }
      .module-footer { align-items: stretch; }
      .module-footer .btn { width: 100%; }
      .panel-actions { flex-direction: column-reverse; }
      .panel-actions .btn { width: 100%; }
    }
  `],
})
export class IntegrationsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly modules = MODULES;
  protected readonly configs = signal<Map<string, IntegrationConfig>>(new Map());
  protected readonly panelOpen = signal(false);
  protected readonly editingModule = signal<ModuleDef | null>(null);

  protected formEnabled = false;
  protected formSettings: Record<string, unknown> = {};

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
    this.formSettings = { ...((cfg?.settings as Record<string, unknown>) ?? {}) };
    this.panelOpen.set(true);
  }

  protected inputType(type: ModuleDef['fields'][number]['type']): string {
    return type === 'password' ? 'password' : type === 'number' ? 'number' : type === 'url' ? 'url' : 'text';
  }

  protected onFieldChange(field: ModuleDef['fields'][number], value: string) {
    this.formSettings = {
      ...this.formSettings,
      [field.key]: field.type === 'number' ? (value === '' ? '' : Number(value)) : value,
    };
  }

  protected saveConfig() {
    const m = this.editingModule();
    if (!m) return;
    const settings = Object.fromEntries(
      m.fields.flatMap((field) => {
        const value = this.formSettings[field.key];
        if (value === '' || value === null || value === undefined) {
          return [];
        }
        return [[field.key, value]];
      }),
    );
    this.api.updateIntegration(m.provider, { enabled: this.formEnabled, settings }).subscribe(() => {
      this.panelOpen.set(false);
      this.loadConfigs();
    });
  }
}
