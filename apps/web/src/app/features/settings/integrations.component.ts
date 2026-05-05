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

interface ZabbixTemplateDto {
  id: string;
  host: string;
  name: string;
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
            <input
              class="form-input"
              [type]="inputType(f.type)"
              [name]="f.key"
              [ngModel]="formSettings[f.key] ?? ''"
              (ngModelChange)="onFieldChange(f, $event)"
            />
          </label>
        </ng-container>
        <div class="mapping-actions" *ngIf="m.provider === 'zabbix'">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="testBusy()" (click)="testZabbixConnection()">
            {{ testBusy() ? 'Testing...' : 'Test Connection' }}
          </button>
        </div>
        <p class="mapping-result" *ngIf="testResult()">{{ testResult() }}</p>
        <div class="mapping-card" *ngIf="m.provider === 'zabbix'">
          <h4>Template Mapping</h4>
          <p class="mapping-desc">Load templates from Zabbix and assign template item keys to selected device type mapping.</p>

          <label class="form-label">
            Zabbix Template
            <select class="form-input" [(ngModel)]="mappingTemplateId" name="mappingTemplateId">
              <option value="">Select template</option>
              <option *ngFor="let t of zabbixTemplates()" [value]="t.id">{{ t.host }} ({{ t.name }})</option>
            </select>
          </label>

          <label class="form-label">
            Vendor (optional)
            <select class="form-input" [(ngModel)]="mappingVendor" name="mappingVendor">
              <option value="">Any vendor</option>
              <option *ngFor="let vendor of vendorOptions()" [value]="vendor">{{ vendor }}</option>
            </select>
          </label>

          <label class="form-label">
            Device Type (optional)
            <select class="form-input" [(ngModel)]="mappingDeviceType" name="mappingDeviceType">
              <option value="">All device types</option>
              <option *ngFor="let type of deviceTypeOptions()" [value]="type">{{ type }}</option>
            </select>
          </label>

          <div class="mapping-actions">
            <button type="button" class="btn btn-outline btn-sm" (click)="reloadZabbixTemplates()">Reload Templates</button>
            <button type="button" class="btn btn-primary btn-sm" [disabled]="!mappingTemplateId || mappingBusy()" (click)="applyTemplateMapping()">
              {{ mappingBusy() ? 'Importing...' : 'Import Template Items' }}
            </button>
          </div>
          <p class="mapping-result" *ngIf="mappingResult()">{{ mappingResult() }}</p>
        </div>
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
    .mapping-card { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
    .mapping-card h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
    .mapping-desc { margin: 0; color: #64748b; font-size: 0.8rem; }
    .mapping-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .mapping-result { margin: 0; color: #1d4ed8; font-size: 0.8rem; font-weight: 600; }
    .panel-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
  `],
})
export class IntegrationsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly modules = MODULES;
  protected readonly configs = signal<Map<string, IntegrationConfig>>(new Map());
  protected readonly panelOpen = signal(false);
  protected readonly editingModule = signal<ModuleDef | null>(null);
  protected readonly zabbixTemplates = signal<ZabbixTemplateDto[]>([]);
  protected readonly vendorOptions = signal<string[]>([]);
  protected readonly deviceTypeOptions = signal<string[]>([]);
  protected readonly mappingBusy = signal(false);
  protected readonly mappingResult = signal('');
  protected readonly testBusy = signal(false);
  protected readonly testResult = signal('');

  protected formEnabled = false;
  protected formSettings: Record<string, unknown> = {};
  protected mappingTemplateId = '';
  protected mappingVendor = '';
  protected mappingDeviceType = '';

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
    this.mappingTemplateId = '';
    this.mappingVendor = '';
    this.mappingDeviceType = '';
    this.mappingResult.set('');
    this.testResult.set('');
    this.panelOpen.set(true);
    if (m.provider === 'zabbix') {
      this.reloadZabbixTemplates();
      this.loadCatalogOptions();
    }
  }

  protected inputType(type: ModuleDef['fields'][number]['type']): string {
    return type === 'password' ? 'password' : type === 'number' ? 'number' : type === 'url' ? 'url' : 'text';
  }

  protected onFieldChange(field: ModuleDef['fields'][number], value: string) {
    this.formSettings = {
      ...this.formSettings,
      [field.key]: field.type === 'number'
        ? (value === '' ? '' : Number(value))
        : value,
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

  protected reloadZabbixTemplates() {
    this.api.getZabbixTemplates().subscribe({
      next: (res) => this.zabbixTemplates.set(res.data),
      error: (error) => this.mappingResult.set(error?.error?.message || 'Failed to load templates'),
    });
  }

  protected applyTemplateMapping() {
    if (!this.mappingTemplateId) {
      return;
    }
    this.mappingBusy.set(true);
    this.mappingResult.set('');
    this.api.mapZabbixTemplate({
      templateId: this.mappingTemplateId,
      vendor: this.mappingVendor || null,
      deviceType: this.mappingDeviceType || null,
      replace: true,
    }).subscribe({
      next: (res) => {
        this.mappingBusy.set(false);
        this.mappingResult.set(`Imported ${res.imported}/${res.totalItems} items.`);
      },
      error: (error) => {
        this.mappingBusy.set(false);
        this.mappingResult.set(error?.error?.message || 'Failed to import template');
      },
    });
  }

  protected testZabbixConnection() {
    this.testBusy.set(true);
    this.testResult.set('');
    this.api.testIntegrationConnection('zabbix').subscribe({
      next: (res) => {
        this.testBusy.set(false);
        const tokenInfo = res.tokenValidated ? 'token validated' : 'token not set';
        this.testResult.set(`Connection OK (Zabbix ${res.version || 'unknown'}, ${tokenInfo}).`);
      },
      error: (error) => {
        this.testBusy.set(false);
        this.testResult.set(error?.error?.message || 'Connection test failed');
      },
    });
  }

  private loadCatalogOptions() {
    this.api.getVendors().subscribe({
      next: (res) => {
        const values = [...new Set(res.data.map((item) => item.name).filter((value) => !!value))];
        this.vendorOptions.set(values.sort((a, b) => a.localeCompare(b, 'sk', { sensitivity: 'base' })));
      },
    });
    this.api.getDeviceTypes().subscribe({
      next: (res) => {
        const values = [...new Set(res.data.map((item) => item.name).filter((value) => !!value))];
        this.deviceTypeOptions.set(values.sort((a, b) => a.localeCompare(b, 'sk', { sensitivity: 'base' })));
      },
    });
  }
}
