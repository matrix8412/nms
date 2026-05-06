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

    <app-slide-panel [isOpen]="panelOpen()" [title]="editingModule()?.label + ' Configuration'" (close)="panelOpen.set(false)">
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
  styles: [``],
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
