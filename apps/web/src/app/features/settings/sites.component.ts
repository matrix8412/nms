import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { ColumnFilterTriggerComponent } from '../../core/layout/column-filter-trigger.component';
import { OpenstreetMapPickerComponent } from '../../core/layout/openstreet-map-picker.component';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';
import type { SiteDto } from '@nms/shared';

type SortField = 'name' | 'city' | 'zipNumber';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule, SlidePanelComponent, ColumnFilterTriggerComponent, OpenstreetMapPickerComponent],
  template: `
    <div class="page-header" *ngIf="!embedded()">
      <div>
        <h1>Sites</h1>
        <p class="subtitle">Manage physical locations and map coordinates for hosts</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">
        <span class="material-icons">add</span> New Site
      </button>
    </div>

    <div class="table-card">
      <div class="table-toolbar" *ngIf="embedded()">
        <div style="flex: 1"></div>
        <button class="btn btn-primary" (click)="openCreate()">
          <span class="material-icons">add</span> New Site
        </button>
      </div>

      <table class="data-table" *ngIf="sorted().length; else emptyState">
        <thead>
          <tr>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('name')">
                  Site name
                  <span class="sort-icon material-icons">{{ getSortIcon('name') }}</span>
                </button>
                <app-column-filter-trigger [active]="!!filterName()" label="Filter site name">
                  <input type="text" class="th-filter" placeholder="Search..." [ngModel]="filterName()" (ngModelChange)="filterName.set($event)" />
                </app-column-filter-trigger>
              </div>
            </th>
            <th>Address</th>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('city')">
                  City
                  <span class="sort-icon material-icons">{{ getSortIcon('city') }}</span>
                </button>
                <app-column-filter-trigger [active]="!!filterCity()" label="Filter city">
                  <input type="text" class="th-filter" placeholder="Search..." [ngModel]="filterCity()" (ngModelChange)="filterCity.set($event)" />
                </app-column-filter-trigger>
              </div>
            </th>
            <th class="sortable">
              <div class="header-cell">
                <button type="button" class="header-sort" (click)="toggleSort('zipNumber')">
                  ZIP
                  <span class="sort-icon material-icons">{{ getSortIcon('zipNumber') }}</span>
                </button>
              </div>
            </th>
            <th>Coordinates</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let site of sorted()">
            <td class="cell-name">{{ site.name }}</td>
            <td class="cell-address">{{ formatStreet(site) }}</td>
            <td>{{ site.city }}</td>
            <td class="mono">{{ site.zipNumber }}</td>
            <td class="cell-coords">
              <span class="coord-line">Lat {{ formatCoordinate(site.latitude) }}</span>
              <span class="coord-line">Lng {{ formatCoordinate(site.longitude) }}</span>
            </td>
            <td class="col-actions">
              <button class="icon-btn" title="Edit" (click)="openEdit(site)">
                <span class="material-icons">edit</span>
              </button>
              <button class="icon-btn danger" title="Delete" (click)="confirmDelete(site)">
                <span class="material-icons">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyState>
        <div class="empty">
          <span class="material-icons">location_city</span>
          <p>No sites found</p>
        </div>
      </ng-template>
    </div>

    <app-slide-panel
      [isOpen]="panelOpen()"
      [title]="editing() ? 'Edit Site' : 'New Site'"
      (close)="panelOpen.set(false)"
    >
      <form (ngSubmit)="save()" class="panel-form">
        <div class="form-grid">
          <label class="form-label form-span-2">
            Site name
            <input class="form-input" [(ngModel)]="form.name" name="name" required />
          </label>

          <label class="form-label">
            Street
            <input class="form-input" [(ngModel)]="form.street" name="street" required />
          </label>

          <label class="form-label">
            Descriptive number
            <input class="form-input" [(ngModel)]="form.descriptiveNumber" name="descriptiveNumber" required />
          </label>

          <label class="form-label">
            Orientation number
            <input class="form-input" [(ngModel)]="form.orientationNumber" name="orientationNumber" />
          </label>

          <label class="form-label">
            ZIP number
            <input class="form-input" [(ngModel)]="form.zipNumber" name="zipNumber" required />
          </label>

          <label class="form-label">
            City
            <input class="form-input" [(ngModel)]="form.city" name="city" required />
          </label>

          <label class="form-label">
            Latitude
            <input class="form-input" type="number" step="0.000001" [(ngModel)]="form.latitude" name="latitude" required />
          </label>

          <label class="form-label">
            Longitude
            <input class="form-input" type="number" step="0.000001" [(ngModel)]="form.longitude" name="longitude" required />
          </label>

          <label class="form-label form-span-2">
            Description
            <textarea class="form-input" [(ngModel)]="form.description" name="description" rows="3"></textarea>
          </label>
        </div>

        <div class="map-section">
          <div class="map-section-header">
            <span>Select coordinates on map</span>
            <small>Click anywhere on the OpenStreetMap layer to update latitude and longitude.</small>
          </div>
          <app-openstreet-map-picker
            *ngIf="panelOpen()"
            [latitude]="currentLatitude()"
            [longitude]="currentLongitude()"
            (coordinatesChange)="onCoordinatesSelected($event)"
          />
        </div>

        <div class="panel-actions">
          <button type="button" class="btn btn-outline" (click)="panelOpen.set(false)">Cancel</button>
          <button type="submit" class="btn btn-primary">{{ editing() ? 'Update' : 'Create' }}</button>
        </div>
      </form>
    </app-slide-panel>

    <div class="modal-overlay" *ngIf="deleteTarget()" (click)="deleteTarget.set(null)">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3>Delete Site</h3>
        <p>Are you sure you want to delete <strong>{{ deleteTarget()?.name }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn btn-outline" (click)="deleteTarget.set(null)">Cancel</button>
          <button class="btn btn-danger" (click)="doDelete()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
      .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
      .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
      .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: background .15s; }
      .btn-primary { background: #3b82f6; color: #fff; }
      .btn-primary:hover { background: #2563eb; }
      .btn-outline { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
      .btn-outline:hover { background: #f8fafc; }
      .btn-danger { background: #ef4444; color: #fff; }
      .btn-danger:hover { background: #dc2626; }
      .btn .material-icons { font-size: 18px; }

      .table-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
      .table-toolbar { display: flex; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; gap: 12px; align-items: center; }
      .data-table { width: 100%; border-collapse: collapse; }
      .data-table th { text-align: left; padding: 10px 20px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
      .data-table th.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
      .data-table th.sortable:hover { color: #334155; }
      .header-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .header-sort { display: inline-flex; align-items: center; gap: 2px; padding: 0; border: none; background: none; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
      .header-sort:hover { color: #334155; }
      .sort-icon { font-size: 14px; vertical-align: middle; margin-left: 2px; color: #c0c8d4; }
      .data-table th.sortable:hover .sort-icon, .header-sort:hover .sort-icon { color: #64748b; }
      .th-filter { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #fff; outline: none; color: #334155; box-sizing: border-box; }
      .th-filter:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.1); }
      .data-table td { padding: 12px 20px; font-size: 0.88rem; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      .cell-name { font-weight: 600; color: #1a2332; }
      .cell-address { max-width: 260px; }
      .cell-coords { white-space: nowrap; }
      .coord-line { display: block; color: #475569; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }
      .col-actions { width: 100px; text-align: right; }
      .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: #64748b; }
      .icon-btn:hover { background: #f1f5f9; color: #334155; }
      .icon-btn.danger:hover { color: #ef4444; background: #fef2f2; }
      .icon-btn .material-icons { font-size: 18px; }
      .empty { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; color: #94a3b8; }
      .empty .material-icons { font-size: 48px; margin-bottom: 12px; }
      .empty p { margin: 0; font-size: 0.92rem; }

      .panel-form { display: flex; flex-direction: column; gap: 18px; padding: 20px; }
      .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .form-span-2 { grid-column: span 2; }
      .form-label { display: flex; flex-direction: column; gap: 6px; font-size: 0.84rem; font-weight: 600; color: #334155; }
      .form-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; font-family: inherit; }
      .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
      textarea.form-input { resize: vertical; min-height: 88px; }
      .map-section { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
      .map-section-header { display: flex; flex-direction: column; gap: 4px; }
      .map-section-header span { font-size: 0.88rem; font-weight: 700; color: #1e293b; }
      .map-section-header small { color: #64748b; font-size: 0.78rem; }
      .panel-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
      .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 200; }
      .modal-card { background: #fff; border-radius: 14px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
      .modal-card h3 { margin: 0 0 8px; font-size: 1.1rem; }
      .modal-card p { margin: 0 0 20px; color: #64748b; font-size: 0.9rem; }
      .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

      @media (max-width: 800px) {
        .form-grid { grid-template-columns: 1fr; }
        .form-span-2 { grid-column: span 1; }
      }
    `,
  ],
})
export class SitesComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly embedded = input(false);

  protected readonly sites = signal<SiteDto[]>([]);
  protected readonly filterName = signal('');
  protected readonly filterCity = signal('');
  protected readonly sortField = signal<SortField | ''>('name');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<SiteDto | null>(null);
  protected readonly deleteTarget = signal<SiteDto | null>(null);

  protected form = this.emptyForm();

  protected readonly filtered = computed(() => {
    const name = this.filterName().trim().toLowerCase();
    const city = this.filterCity().trim().toLowerCase();
    return this.sites().filter((site) =>
      (!name || site.name.toLowerCase().includes(name)) &&
      (!city || site.city.toLowerCase().includes(city)),
    );
  });

  protected readonly sorted = computed(() => {
    const items = this.filtered();
    const field = this.sortField();
    const dir = this.sortDir();
    if (!field) {
      return items;
    }

    const sorted = [...items].sort((left, right) => {
      const aVal = left[field].toString().toLowerCase();
      const bVal = right[field].toString().toLowerCase();
      return aVal.localeCompare(bVal, 'sk', { sensitivity: 'base' });
    });

    return dir === 'desc' ? sorted.reverse() : sorted;
  });

  ngOnInit() {
    this.load();
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

  protected openCreate() {
    this.editing.set(null);
    this.form = this.emptyForm();
    this.panelOpen.set(true);
  }

  protected openEdit(site: SiteDto) {
    this.editing.set(site);
    this.form = {
      name: site.name,
      street: site.street,
      descriptiveNumber: site.descriptiveNumber,
      orientationNumber: site.orientationNumber ?? '',
      zipNumber: site.zipNumber,
      city: site.city,
      latitude: site.latitude,
      longitude: site.longitude,
      description: site.description ?? '',
    };
    this.panelOpen.set(true);
  }

  protected save() {
    const payload = {
      name: this.form.name.trim(),
      street: this.form.street.trim(),
      descriptiveNumber: this.form.descriptiveNumber.trim(),
      orientationNumber: this.form.orientationNumber.trim() || null,
      zipNumber: this.form.zipNumber.trim(),
      city: this.form.city.trim(),
      latitude: Number(this.form.latitude),
      longitude: Number(this.form.longitude),
      description: this.form.description.trim() || null,
    };

    const editing = this.editing();
    const request = editing
      ? this.api.updateSite(editing.id, payload)
      : this.api.createSite(payload);

    request.subscribe(() => {
      this.panelOpen.set(false);
      this.load();
    });
  }

  protected confirmDelete(site: SiteDto) {
    this.deleteTarget.set(site);
  }

  protected doDelete() {
    const site = this.deleteTarget();
    if (!site) {
      return;
    }

    this.api.deleteSite(site.id).subscribe(() => {
      this.deleteTarget.set(null);
      this.load();
    });
  }

  protected onCoordinatesSelected(coords: { latitude: number; longitude: number }) {
    this.form.latitude = coords.latitude;
    this.form.longitude = coords.longitude;
  }

  protected currentLatitude() {
    return this.toNullableNumber(this.form.latitude);
  }

  protected currentLongitude() {
    return this.toNullableNumber(this.form.longitude);
  }

  protected formatStreet(site: SiteDto) {
    return [site.street, site.descriptiveNumber, site.orientationNumber ? `/${site.orientationNumber}` : '']
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected formatCoordinate(value: number) {
    return value.toFixed(6);
  }

  private load() {
    this.api.getSites().subscribe((res) => this.sites.set(res.data));
  }

  private emptyForm() {
    return {
      name: '',
      street: '',
      descriptiveNumber: '',
      orientationNumber: '',
      zipNumber: '',
      city: '',
      latitude: 48.1485965,
      longitude: 17.1077477,
      description: '',
    };
  }

  private toNullableNumber(value: number | string | null | undefined) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }
}
