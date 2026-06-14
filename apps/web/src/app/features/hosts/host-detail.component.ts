import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { ColumnFilterTriggerComponent } from '../../core/layout/column-filter-trigger.component';
import { SlidePanelComponent } from '../../core/layout/slide-panel.component';
import { matchesSearchText, normalizeSearchText } from '../../core/utils/search.util';
import { HostFormComponent } from './host-form.component';
import type { DeviceDto } from '@nms/shared';

type InterfaceSortDir = 'asc' | 'desc';
type InterfaceColumnKey = 'index' | 'name' | 'operStatus' | 'mac' | `metric:${string}`;

type InterfaceColumnDef = {
  key: InterfaceColumnKey;
  label: string;
  metricKey?: string;
};

@Component({
  selector: 'app-host-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SlidePanelComponent, HostFormComponent, ColumnFilterTriggerComponent, CdkDropList, CdkDrag],
  template: `
    <div class="page-header">
      <div class="breadcrumb">
        <a routerLink="/hosts" class="back-link">
          <span class="material-icons">arrow_back</span>
          Hosts
        </a>
        <span class="separator">/</span>
        <span class="current">{{ host()?.description || 'Loading...' }}</span>
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

    <div class="overview-shell" *ngIf="host() && activeTab() === 'overview'">
      <section class="hero-card">
        <div class="hero-main">
          <div class="hero-kicker">
            <span class="material-icons">dns</span>
            Host overview
          </div>
          <h1 class="hero-title">{{ host()!.description }}</h1>
          <div class="hero-address mono">{{ host()!.ip }}</div>

          <div class="hero-badges">
            <span class="hero-chip" *ngIf="host()!.vendor">{{ host()!.vendor }}</span>
            <span class="hero-chip type-chip" *ngIf="host()!.type">{{ host()!.type }}</span>
            <span class="hero-chip" *ngIf="host()!.site?.name">
              <span class="material-icons">place</span>
              {{ host()!.site!.name }}
            </span>
            <span class="hero-chip" *ngIf="host()!.snmpHostname">
              <span class="material-icons">memory</span>
              {{ host()!.snmpHostname }}
            </span>
          </div>

          <div class="tag-badges hero-tags" *ngIf="host()!.tags?.length">
            <span
              class="tag-badge"
              *ngFor="let tag of host()!.tags"
              [style.background-color]="tag.color"
              [style.color]="tagTextColor(tag.color)"
            >
              {{ tag.name }}
            </span>
          </div>
        </div>

        <div class="hero-status">
          <div class="status-panel">
            <span class="status-panel-label">SNMP</span>
            <span
              class="status-badge large"
              [class.status-up]="host()!.snmpStatus === 'UP'"
              [class.status-down]="host()!.snmpStatus === 'DOWN'"
              [class.status-unknown]="host()!.snmpStatus === 'UNKNOWN'"
            >
              <span class="status-dot"></span>
              {{ host()!.snmpStatus }}
            </span>
            <small>{{ host()!.snmpLastSyncAt ? ('Last sync ' + (host()!.snmpLastSyncAt | date:'short')) : 'No SNMP sync yet' }}</small>
          </div>
          <div class="status-panel">
            <span class="status-panel-label">ICMP</span>
            <span
              class="status-badge large"
              [class.status-up]="host()!.icmpStatus === 'UP'"
              [class.status-down]="host()!.icmpStatus === 'DOWN'"
              [class.status-unknown]="host()!.icmpStatus === 'UNKNOWN'"
            >
              <span class="status-dot"></span>
              {{ host()!.icmpStatus }}
            </span>
            <small>{{ pingSummary() }}</small>
          </div>
        </div>
      </section>

      <div class="overview-grid">
        <div class="info-card">
          <div class="card-title">
            <span class="material-icons">badge</span>
            Identity
          </div>
          <div class="info-rows">
            <div class="info-row"><span class="info-label">Description</span><span class="info-value">{{ host()!.description }}</span></div>
            <div class="info-row"><span class="info-label">IP/Hostname</span><span class="info-value mono">{{ host()!.ip }}</span></div>
            <div class="info-row"><span class="info-label">Vendor</span><span class="info-value">{{ host()!.vendor || '—' }}</span></div>
            <div class="info-row">
              <span class="info-label">Type</span>
              <span class="info-value"><span class="type-badge" *ngIf="host()!.type">{{ host()!.type }}</span><span *ngIf="!host()!.type">—</span></span>
            </div>
            <div class="info-row">
              <span class="info-label">Groups</span>
              <span class="info-value chips-value" *ngIf="host()!.deviceGroups?.length; else noGroups">
                <span class="subtle-chip" *ngFor="let group of host()!.deviceGroups">{{ group.name }}</span>
              </span>
              <ng-template #noGroups><span class="info-value">—</span></ng-template>
            </div>
            <div class="info-row">
              <span class="info-label">Tags</span>
              <span class="info-value">
                <span class="tag-badges" *ngIf="host()!.tags?.length; else noTags">
                  <span
                    class="tag-badge"
                    *ngFor="let tag of host()!.tags"
                    [style.background-color]="tag.color"
                    [style.color]="tagTextColor(tag.color)"
                  >
                    {{ tag.name }}
                  </span>
                </span>
                <ng-template #noTags>—</ng-template>
              </span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="card-title">
            <span class="material-icons">network_check</span>
            Monitoring
          </div>
          <div class="info-rows">
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
              </span>
            </div>
            <div class="info-row" *ngIf="host()!.snmpHostname"><span class="info-label">SNMP Hostname</span><span class="info-value">{{ host()!.snmpHostname }}</span></div>
            <div class="info-row" *ngIf="host()!.snmpSoftwareVersion"><span class="info-label">Software Version</span><span class="info-value">{{ host()!.snmpSoftwareVersion }}</span></div>
            <div class="info-row" *ngIf="host()!.snmpUptimeTicks != null"><span class="info-label">SNMP Uptime</span><span class="info-value">{{ formatSnmpUptime(host()!.snmpUptimeTicks!) }}</span></div>
            <div class="info-row" *ngIf="host()!.snmpLastSyncAt"><span class="info-label">Last SNMP Sync</span><span class="info-value">{{ host()!.snmpLastSyncAt | date:'medium' }}</span></div>
            <div class="info-row" *ngIf="host()!.snmpLastError"><span class="info-label">SNMP Error</span><span class="info-value danger-text">{{ host()!.snmpLastError }}</span></div>
            <div class="info-row">
              <span class="info-label">ICMP Status</span>
              <span class="info-value inline-value">
                <span class="status-badge"
                      [class.status-up]="host()!.icmpStatus === 'UP'"
                      [class.status-down]="host()!.icmpStatus === 'DOWN'"
                      [class.status-unknown]="host()!.icmpStatus === 'UNKNOWN'">
                  <span class="status-dot"></span>
                  {{ host()!.icmpStatus }}
                </span>
                <span class="ping-info" *ngIf="host()!.lastPingDuration != null">{{ host()!.lastPingDuration }} ms</span>
              </span>
            </div>
            <div class="info-row" *ngIf="host()!.lastPingAt"><span class="info-label">Last Ping</span><span class="info-value">{{ host()!.lastPingAt | date:'medium' }}</span></div>
          </div>
        </div>

        <div class="info-card">
          <div class="card-title">
            <span class="material-icons">place</span>
            Location
          </div>
          <div class="info-rows">
            <div class="info-row"><span class="info-label">Site</span><span class="info-value">{{ host()!.site?.name || '—' }}</span></div>
            <div class="info-row" *ngIf="host()!.site"><span class="info-label">Address</span><span class="info-value align-end">{{ formatSiteAddress() }}</span></div>
            <div class="info-row" *ngIf="host()!.site"><span class="info-label">Coordinates</span><span class="info-value mono">{{ host()!.site!.latitude.toFixed(6) }}, {{ host()!.site!.longitude.toFixed(6) }}</span></div>
            <div class="info-row" *ngIf="host()!.site?.description"><span class="info-label">Site Description</span><span class="info-value align-end">{{ host()!.site!.description }}</span></div>
          </div>
        </div>

        <div class="info-card metrics-card">
          <div class="card-title">
            <span class="material-icons">monitoring</span>
            Overview Metrics
          </div>
          <div class="metric-list" *ngIf="overviewMetricEntries().length; else noMetrics">
            <div class="metric-item" *ngFor="let metric of overviewMetricEntries()">
              <span class="metric-name">{{ metricLabel(metric[0]) }}</span>
              <span class="metric-value">{{ metric[1] ?? '—' }}</span>
            </div>
          </div>
          <ng-template #noMetrics>
            <div class="empty-state compact-empty">
              <span class="material-icons">monitoring</span>
              <p>No SNMP overview metrics available.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>

    <div class="interfaces-shell" *ngIf="host() && activeTab() === 'interfaces'">
      <section class="interfaces-hero">
        <div>
          <div class="hero-kicker">
            <span class="material-icons">lan</span>
            Host interfaces
          </div>
          <h2 class="interfaces-title">Network Interfaces</h2>
          <p class="interfaces-subtitle">Discovered ports, operational state and SNMP metrics for this host.</p>
        </div>
        <div class="interfaces-summary">
          <div class="interfaces-pill">
            <span class="interfaces-pill-value">{{ interfaceCount() }}</span>
            <span class="interfaces-pill-label">total</span>
          </div>
          <div class="interfaces-pill up">
            <span class="interfaces-pill-value">{{ interfaceUpCount() }}</span>
            <span class="interfaces-pill-label">up</span>
          </div>
          <div class="interfaces-pill down">
            <span class="interfaces-pill-value">{{ interfaceDownCount() }}</span>
            <span class="interfaces-pill-label">down</span>
          </div>
          <div class="interfaces-pill">
            <span class="interfaces-pill-value">{{ interfaceMetricColumns().length }}</span>
            <span class="interfaces-pill-label">metric types</span>
          </div>
        </div>
      </section>

      <div class="info-card interfaces-table-card" *ngIf="host()!.snmpInterfaces?.length; else emptyInterfacesState">
        <div class="card-title">
          <span class="material-icons">table_rows</span>
          Interface Table
        </div>
        <div class="interfaces-toolbar">
          <div class="interfaces-toolbar-left">
            <div class="interfaces-filter-group">
              <button type="button" class="interfaces-filter-btn" [class.active]="interfaceStatusFilter() === 'all'" (click)="interfaceStatusFilter.set('all')">
                All
              </button>
              <button type="button" class="interfaces-filter-btn" [class.active]="interfaceStatusFilter() === 'up'" (click)="interfaceStatusFilter.set('up')">
                Up
              </button>
              <button type="button" class="interfaces-filter-btn" [class.active]="interfaceStatusFilter() === 'down'" (click)="interfaceStatusFilter.set('down')">
                Down
              </button>
            </div>
          </div>

          <div class="interfaces-toolbar-right">
            <label class="interfaces-search">
              <span class="material-icons">search</span>
              <input
                type="text"
                [value]="interfaceSearch()"
                (input)="interfaceSearch.set($any($event.target).value)"
                placeholder="Search name, description, MAC, metrics"
              />
            </label>

            <app-column-filter-trigger [active]="hiddenInterfaceColumnCount() > 0" label="Customize visible columns">
              <div class="column-picker">
                <div class="column-picker-title">Visible columns</div>
                <label class="column-picker-row" *ngFor="let column of orderedInterfaceColumns()">
                  <input
                    type="checkbox"
                    [checked]="isInterfaceColumnVisible(column.key)"
                    (change)="toggleInterfaceColumnVisibility(column.key)"
                  />
                  <span>{{ column.label }}</span>
                </label>
              </div>
            </app-column-filter-trigger>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr
                cdkDropList
                cdkDropListOrientation="horizontal"
                [cdkDropListData]="visibleInterfaceColumns()"
                (cdkDropListDropped)="dropInterfaceColumn($event)"
              >
                <th *ngFor="let column of visibleInterfaceColumns(); trackBy: trackInterfaceColumn" cdkDrag>
                  <button type="button" class="th-sort-btn" (click)="toggleInterfaceSort(column.key)">
                    <span class="th-sort-label">{{ column.label }}</span>
                    <span class="material-icons drag-handle" cdkDragHandle title="Drag to reorder">drag_indicator</span>
                    <span class="material-icons">{{ getInterfaceSortIcon(column.key) }}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of filteredInterfaces()">
                <td *ngFor="let column of visibleInterfaceColumns(); trackBy: trackInterfaceColumn" [class.mono]="column.key === 'index' || column.key === 'mac'">
                  <ng-container [ngSwitch]="column.key">
                    <ng-container *ngSwitchCase="'name'">
                      <div class="table-name-cell">
                        <strong>{{ item.name }}</strong>
                        <span>{{ item.description || '—' }}</span>
                      </div>
                    </ng-container>
                    <ng-container *ngSwitchCase="'operStatus'">
                      <span class="status-badge"
                            [class.status-up]="item.operStatus === 'up'"
                            [class.status-down]="item.operStatus === 'down'"
                            [class.status-unknown]="item.operStatus !== 'up' && item.operStatus !== 'down'">
                        <span class="status-dot"></span>
                        {{ item.operStatus || 'unknown' }}
                      </span>
                    </ng-container>
                    <ng-container *ngSwitchDefault>
                      {{ getInterfaceCellValue(item, column) }}
                    </ng-container>
                  </ng-container>
                </td>
              </tr>
              <tr *ngIf="filteredInterfaces().length === 0">
                <td class="empty" [attr.colspan]="visibleInterfaceColumns().length">No interfaces match the current filter.</td>
              </tr>
            </tbody>
          </table>
        </div>
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

    <app-slide-panel [isOpen]="editPanelOpen()" title="Edit Host" (close)="editPanelOpen.set(false)">
      <app-host-form *ngIf="editPanelOpen() && host()" [host]="host()" (saved)="onSaved()" (cancelled)="editPanelOpen.set(false)" />
    </app-slide-panel>
  `,
  styles: [
    `
      .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
      .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 0.92rem; }
      .back-link { display: flex; align-items: center; gap: 4px; color: #3b82f6; text-decoration: none; font-weight: 600; }
      .back-link:hover { text-decoration: underline; }
      .back-link .material-icons { font-size: 18px; }
      .separator { color: #94a3b8; }
      .current { font-weight: 600; color: #1a2332; }
      .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: inherit; }
      .btn-primary { background: #3b82f6; color: #fff; }
      .detail-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
      .detail-tab { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid #dbe4ee; border-radius: 999px; background: #fff; color: #475569; font-size: 0.88rem; font-weight: 700; cursor: pointer; }
      .detail-tab.active { background: #0f172a; border-color: #0f172a; color: #fff; }
      .detail-tab-count { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: rgba(148, 163, 184, 0.18); display: inline-flex; align-items: center; justify-content: center; font-size: 0.78rem; }
      .detail-tab.active .detail-tab-count { background: rgba(255, 255, 255, 0.16); }
      .overview-shell { display: flex; flex-direction: column; gap: 20px; }
      .hero-card {
        display: grid;
        grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.9fr);
        gap: 20px;
        padding: 24px;
        border-radius: 24px;
        background:
          radial-gradient(circle at top right, rgba(59, 130, 246, 0.24), transparent 32%),
          linear-gradient(135deg, #0f172a 0%, #14253f 55%, #17365d 100%);
        color: #fff;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
      }
      .hero-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
      .hero-kicker { display: inline-flex; align-items: center; gap: 8px; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(191, 219, 254, 0.95); }
      .hero-kicker .material-icons { font-size: 18px; }
      .hero-title { margin: 0; font-size: clamp(1.8rem, 4vw, 2.6rem); line-height: 1.02; }
      .hero-address { color: rgba(226, 232, 240, 0.92); font-size: 0.92rem; }
      .hero-badges, .hero-tags { display: flex; flex-wrap: wrap; gap: 8px; }
      .hero-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 0.82rem;
        font-weight: 700;
        color: #eff6ff;
      }
      .hero-chip .material-icons { font-size: 16px; }
      .type-chip { background: rgba(14, 165, 233, 0.16); }
      .hero-status { display: grid; gap: 10px; align-content: start; }
      .status-panel {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 12px;
        border-radius: 14px;
        min-height: 78px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
      }
      .status-panel-label { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(191, 219, 254, 0.9); }
      .status-panel small { color: rgba(226, 232, 240, 0.9); font-size: 0.7rem; line-height: 1.25; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
      .summary-tile {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 18px 20px;
        border-radius: 18px;
        border: 1px solid #dbe4ee;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        min-width: 0;
      }
      .summary-label { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }
      .summary-value { font-size: 1.55rem; font-weight: 800; color: #0f172a; line-height: 1.1; }
      .summary-value.compact { font-size: 1.05rem; line-height: 1.35; }
      .summary-meta { font-size: 0.8rem; color: #64748b; }
      .overview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
      .info-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden; }
      .interfaces-card { grid-column: 1 / -1; }
      .interfaces-shell { display: flex; flex-direction: column; gap: 20px; }
      .interfaces-hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
        padding: 22px 24px;
        border-radius: 22px;
        background:
          radial-gradient(circle at top right, rgba(14, 165, 233, 0.2), transparent 26%),
          linear-gradient(135deg, #ffffff 0%, #f8fbff 52%, #edf5ff 100%);
        border: 1px solid #dbe7f3;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
      }
      .interfaces-title { margin: 6px 0 6px; font-size: 1.45rem; line-height: 1.1; color: #0f172a; }
      .interfaces-subtitle { margin: 0; max-width: 44rem; font-size: 0.88rem; color: #64748b; }
      .interfaces-summary { display: grid; grid-template-columns: repeat(4, minmax(92px, 1fr)); gap: 10px; min-width: min(100%, 420px); }
      .interfaces-pill {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #dbe4ee;
      }
      .interfaces-pill.up { background: #f0fdf4; border-color: #bbf7d0; }
      .interfaces-pill.down { background: #fef2f2; border-color: #fecaca; }
      .interfaces-pill-value { font-size: 1.2rem; font-weight: 800; color: #0f172a; line-height: 1; }
      .interfaces-pill-label { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }
      .interfaces-table-card { overflow: hidden; }
      .interfaces-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .interfaces-toolbar-left {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .interfaces-toolbar-right {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-wrap: nowrap;
        margin-left: auto;
        min-width: 0;
      }
      .interfaces-filter-group {
        display: inline-flex;
        gap: 6px;
        padding: 4px;
        border: 1px solid #dbe4ee;
        border-radius: 999px;
        background: #fff;
      }
      .interfaces-filter-btn {
        border: none;
        border-radius: 999px;
        padding: 7px 12px;
        background: transparent;
        color: #64748b;
        font-size: 0.78rem;
        font-weight: 800;
        cursor: pointer;
        font-family: inherit;
      }
      .interfaces-filter-btn.active {
        background: #0f172a;
        color: #fff;
      }
      .interfaces-search {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 260px;
        flex: 1 1 360px;
        padding: 10px 12px;
        border: 1px solid #dbe4ee;
        border-radius: 12px;
        background: #fff;
      }
      .interfaces-search .material-icons { font-size: 18px; color: #64748b; }
      .interfaces-search input {
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
        font: inherit;
        font-size: 0.84rem;
        color: #0f172a;
      }
      .column-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .column-picker-title {
        font-size: 0.8rem;
        font-weight: 800;
        color: #334155;
      }
      .column-picker-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.82rem;
        color: #475569;
      }
      .column-picker-row input {
        accent-color: #2563eb;
      }
      .table-name-cell { display: flex; flex-direction: column; gap: 4px; min-width: 180px; }
      .table-name-cell strong { font-size: 0.84rem; color: #0f172a; }
      .table-name-cell span { font-size: 0.78rem; color: #64748b; }
      .card-title { display: flex; align-items: center; gap: 8px; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 0.95rem; color: #1a2332; }
      .card-title .material-icons { color: #3b82f6; font-size: 20px; }
      .info-rows { padding: 4px 0; }
      .info-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 12px 20px; border-bottom: 1px solid #f1f5f9; }
      .info-row:last-child { border-bottom: none; }
      .info-label { font-size: 0.84rem; color: #64748b; font-weight: 500; }
      .info-value { font-size: 0.88rem; color: #1a2332; font-weight: 600; text-align: right; }
      .inline-value, .chips-value { display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
      .align-end { max-width: 26rem; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }
      .type-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; background: #e0f2fe; color: #0369a1; font-size: 0.78rem; font-weight: 600; }
      .tag-badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
      .tag-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 2px 9px; border-radius: 999px; font-size: 0.76rem; font-weight: 700; }
      .subtle-chip { display: inline-flex; align-items: center; min-height: 24px; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 0.76rem; font-weight: 700; }
      .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #f1f5f9; color: #94a3b8; }
      .status-badge.large { width: fit-content; padding: 3px 10px; font-size: 0.78rem; font-weight: 800; }
      .status-badge .status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
      .status-badge.status-up { background: #dcfce7; color: #16a34a; }
      .status-badge.status-down { background: #fef2f2; color: #dc2626; }
      .status-badge.status-unknown { background: #f1f5f9; color: #94a3b8; }
      .ping-info { margin-left: 8px; font-size: 0.82rem; color: #64748b; }
      .danger-text { color: #b91c1c; }
      .metrics-card { grid-column: 1 / -1; }
      .metric-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding: 18px 20px 20px; }
      .metric-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid #e2e8f0;
        background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
      }
      .metric-name { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; }
      .metric-value { font-size: 1rem; font-weight: 700; color: #0f172a; word-break: break-word; }
      .table-wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 10px 16px; font-size: 0.78rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
      td { padding: 10px 16px; font-size: 0.86rem; color: #334155; border-bottom: 1px solid #f1f5f9; }
      .th-sort-btn {
        width: 100%;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        padding: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-transform: inherit;
        letter-spacing: inherit;
        cursor: pointer;
      }
      .th-sort-label { white-space: nowrap; }
      .drag-handle { font-size: 16px; color: #94a3b8; cursor: grab; }
      .th-sort-btn > .material-icons:last-child { font-size: 16px; margin-left: auto; }
      .empty-state { display: flex; flex-direction: column; align-items: center; padding: 32px; color: #94a3b8; gap: 8px; }
      .compact-empty { padding: 24px; }
      .empty-state .material-icons { font-size: 32px; }
      .empty-state p { margin: 0; font-size: 0.88rem; }
      .loading, .error-state { text-align: center; padding: 40px; color: #64748b; }
      .error-state { color: #dc2626; }
      @media (max-width: 1100px) {
        .hero-card,
        .overview-grid,
        .summary-grid { grid-template-columns: 1fr; }
        .hero-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .interfaces-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); min-width: 0; width: 100%; }
      }
      @media (max-width: 900px) {
        .detail-tabs { flex-wrap: wrap; }
        .hero-card { padding: 20px; }
        .hero-status { grid-template-columns: 1fr; }
        .info-row { flex-direction: column; }
        .info-value, .tag-badges { text-align: left; justify-content: flex-start; }
        .align-end { max-width: none; }
        .interfaces-hero { padding: 18px; }
        .interfaces-toolbar { align-items: stretch; }
        .interfaces-toolbar-left { width: 100%; justify-content: space-between; }
        .interfaces-toolbar-right { width: 100%; margin-left: 0; }
        .interfaces-search { min-width: 0; flex: 1 1 auto; }
      }
      @media (max-width: 640px) {
        .interfaces-summary { grid-template-columns: 1fr 1fr; }
      }
    `,
  ],
})
export class HostDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  protected readonly host = signal<DeviceDto | null>(null);
  protected readonly activeTab = signal<'overview' | 'interfaces'>('overview');
  protected readonly editPanelOpen = signal(false);
  protected readonly error = signal('');
  protected readonly interfaceMetricColumns = computed(() => {
    const keys = new Set<string>();
    for (const item of this.host()?.snmpInterfaces ?? []) {
      for (const key of Object.keys(item.metrics ?? {})) {
        keys.add(key);
      }
    }
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  });
  protected readonly overviewMetricEntries = computed(() =>
    Object.entries(this.host()?.snmpOverviewMetrics ?? {}).sort((a, b) => a[0].localeCompare(b[0])),
  );
  protected readonly sortedInterfaces = computed(() =>
    [...(this.host()?.snmpInterfaces ?? [])].sort((a, b) => a.index - b.index),
  );
  protected readonly interfaceSearch = signal('');
  protected readonly interfaceStatusFilter = signal<'all' | 'up' | 'down'>('all');
  protected readonly interfaceSortField = signal<InterfaceColumnKey>('index');
  protected readonly interfaceSortDir = signal<InterfaceSortDir>('asc');
  protected readonly interfaceColumnOrder = signal<InterfaceColumnKey[]>([]);
  protected readonly interfaceVisibleColumnKeys = signal<InterfaceColumnKey[]>([]);
  protected readonly interfaceCount = computed(() => this.sortedInterfaces().length);
  protected readonly interfaceUpCount = computed(
    () => this.sortedInterfaces().filter((item) => item.operStatus === 'up').length,
  );
  protected readonly interfaceDownCount = computed(
    () => this.sortedInterfaces().filter((item) => item.operStatus === 'down').length,
  );
  protected readonly interfaceColumns = computed<InterfaceColumnDef[]>(() => [
    { key: 'index', label: '#' },
    { key: 'name', label: 'Name' },
    { key: 'operStatus', label: 'Oper State' },
    { key: 'mac', label: 'MAC' },
    ...this.interfaceMetricColumns().map((key) => ({
      key: `metric:${key}` as InterfaceColumnKey,
      label: this.metricLabel(key),
      metricKey: key,
    })),
  ]);
  protected readonly orderedInterfaceColumns = computed(() => {
    const available = this.interfaceColumns();
    const byKey = new Map(available.map((column) => [column.key, column]));
    const ordered: InterfaceColumnDef[] = [];

    for (const key of this.interfaceColumnOrder()) {
      const column = byKey.get(key);
      if (column) {
        ordered.push(column);
        byKey.delete(key);
      }
    }

    for (const column of available) {
      if (byKey.has(column.key)) {
        ordered.push(column);
      }
    }

    return ordered;
  });
  protected readonly visibleInterfaceColumns = computed(() => {
    const visible = new Set(this.interfaceVisibleColumnKeys());
    return this.orderedInterfaceColumns().filter((column) => visible.has(column.key));
  });
  protected readonly hiddenInterfaceColumnCount = computed(
    () => this.interfaceColumns().length - this.interfaceVisibleColumnKeys().length,
  );
  protected readonly filteredInterfaces = computed(() => {
    const status = this.interfaceStatusFilter();
    const query = normalizeSearchText(this.interfaceSearch());
    const sortField = this.interfaceSortField();
    const sortDir = this.interfaceSortDir();

    const filtered = this.sortedInterfaces().filter((item) => {
      if (status === 'up' && item.operStatus !== 'up') return false;
      if (status === 'down' && item.operStatus !== 'down') return false;
      if (!query) return true;

      const searchableText = [
        item.index,
        item.name,
        item.description,
        item.mac,
        item.operStatus,
        ...Object.entries(item.metrics ?? {}).flatMap(([key, value]) => [key, value == null ? '' : String(value)]),
      ]
        .filter(Boolean)
        .join(' ');

      return matchesSearchText(searchableText, query);
    });

    return [...filtered].sort((left, right) => {
      const leftValue = this.getInterfaceSortValue(left, sortField);
      const rightValue = this.getInterfaceSortValue(right, sortField);

      if (sortField === 'index') {
        const leftNumber = Number(leftValue);
        const rightNumber = Number(rightValue);
        return sortDir === 'asc' ? leftNumber - rightNumber : rightNumber - leftNumber;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? comparison : -comparison;
    });
  });

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
        this.syncInterfaceColumnSettings();
        this.activeTab.set('overview');
      },
      error: () => this.error.set('Host not found'),
    });
  }

  protected onSaved() {
    this.editPanelOpen.set(false);
    this.loadHost();
  }

  protected pingSummary() {
    const host = this.host();
    if (!host?.lastPingAt) {
      return host?.lastPingDuration != null ? `${host.lastPingDuration} ms response` : 'No ICMP check yet';
    }
    if (host.lastPingDuration != null) {
      return `${host.lastPingDuration} ms on ${new Date(host.lastPingAt).toLocaleString()}`;
    }
    return `Last check ${new Date(host.lastPingAt).toLocaleString()}`;
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

  protected metricLabel(metricKey: string) {
    return metricKey
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (segment) => segment.toUpperCase());
  }

  protected toggleInterfaceSort(field: InterfaceColumnKey) {
    if (this.interfaceSortField() === field) {
      this.interfaceSortDir.set(this.interfaceSortDir() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.interfaceSortField.set(field);
    this.interfaceSortDir.set('asc');
  }

  protected getInterfaceSortIcon(field: InterfaceColumnKey) {
    if (this.interfaceSortField() !== field) return 'unfold_more';
    return this.interfaceSortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected getInterfaceCellValue(item: NonNullable<DeviceDto['snmpInterfaces']>[number], column: InterfaceColumnDef) {
    switch (column.key) {
      case 'index':
        return item.index;
      case 'mac':
        return item.mac || '—';
      default:
        if (column.metricKey) {
          return item.metrics?.[column.metricKey] ?? '—';
        }
        return '—';
    }
  }

  protected dropInterfaceColumn(event: CdkDragDrop<InterfaceColumnDef[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const orderedKeys = this.visibleInterfaceColumns().map((column) => column.key);
    moveItemInArray(orderedKeys, event.previousIndex, event.currentIndex);

    const hiddenKeys = this.orderedInterfaceColumns()
      .map((column) => column.key)
      .filter((key) => !orderedKeys.includes(key));

    this.interfaceColumnOrder.set([...orderedKeys, ...hiddenKeys]);
    this.persistInterfaceColumnSettings();
  }

  protected toggleInterfaceColumnVisibility(columnKey: InterfaceColumnKey) {
    const visible = this.interfaceVisibleColumnKeys();
    if (visible.includes(columnKey)) {
      if (visible.length === 1) return;
      this.interfaceVisibleColumnKeys.set(visible.filter((key) => key !== columnKey));
    } else {
      this.interfaceVisibleColumnKeys.set(
        this.orderedInterfaceColumns()
          .map((column) => column.key)
          .filter((key) => key === columnKey || visible.includes(key)),
      );
    }
    this.persistInterfaceColumnSettings();
  }

  protected isInterfaceColumnVisible(columnKey: InterfaceColumnKey) {
    return this.interfaceVisibleColumnKeys().includes(columnKey);
  }

  protected trackInterfaceColumn = (_index: number, column: InterfaceColumnDef) => column.key;

  private getInterfaceSortValue(item: NonNullable<DeviceDto['snmpInterfaces']>[number], field: InterfaceColumnKey) {
    switch (field) {
      case 'index':
        return item.index;
      case 'name':
        return normalizeSearchText(`${item.name} ${item.description ?? ''}`);
      case 'operStatus':
        return normalizeSearchText(item.operStatus ?? '');
      case 'mac':
        return normalizeSearchText(item.mac ?? '');
      default:
        if (field.startsWith('metric:')) {
          const metricKey = field.slice('metric:'.length);
          return normalizeSearchText(String(item.metrics?.[metricKey] ?? ''));
        }
        return '';
    }
  }

  private syncInterfaceColumnSettings() {
    const availableKeys = this.interfaceColumns().map((column) => column.key);
    const stored = this.readInterfaceColumnSettings();

    const order = stored?.order?.filter((key): key is InterfaceColumnKey => availableKeys.includes(key as InterfaceColumnKey)) ?? [];
    const visible = stored?.visible?.filter((key): key is InterfaceColumnKey => availableKeys.includes(key as InterfaceColumnKey)) ?? [];

    this.interfaceColumnOrder.set([
      ...order,
      ...availableKeys.filter((key) => !order.includes(key)),
    ]);
    this.interfaceVisibleColumnKeys.set(visible.length > 0 ? visible : availableKeys);
  }

  private persistInterfaceColumnSettings() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      'nms.host-detail.interface-columns',
      JSON.stringify({
        order: this.interfaceColumnOrder(),
        visible: this.interfaceVisibleColumnKeys(),
      }),
    );
  }

  private readInterfaceColumnSettings(): { order?: string[]; visible?: string[] } | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem('nms.host-detail.interface-columns');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  protected tagTextColor(color: string) {
    const hex = color.replace('#', '');
    if (hex.length !== 6) {
      return '#ffffff';
    }
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#0f172a' : '#ffffff';
  }
}
