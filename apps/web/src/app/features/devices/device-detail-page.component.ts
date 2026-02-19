import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-device-detail-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  template: `
    <ng-container *ngIf="device; else loadingTpl">
      <mat-card>
        <h1>{{ device.name }}</h1>
        <p><strong>IP:</strong> {{ device.ip }}</p>
        <p><strong>Vendor:</strong> {{ device.vendor || '-' }}</p>
        <p><strong>Type:</strong> {{ device.type || '-' }}</p>
        <p><strong>Zabbix host ID:</strong> {{ device.zabbixHostId || '-' }}</p>
      </mat-card>

      <mat-card>
        <h2>Recent Metrics</h2>
        <table mat-table [dataSource]="metrics">
          <ng-container matColumnDef="itemKey">
            <th mat-header-cell *matHeaderCellDef>Item</th>
            <td mat-cell *matCellDef="let row">{{ row.itemKey }}</td>
          </ng-container>

          <ng-container matColumnDef="valueText">
            <th mat-header-cell *matHeaderCellDef>Value</th>
            <td mat-cell *matCellDef="let row">{{ row.valueText ?? row.valueNumeric }}</td>
          </ng-container>

          <ng-container matColumnDef="recordedAt">
            <th mat-header-cell *matHeaderCellDef>Recorded</th>
            <td mat-cell *matCellDef="let row">{{ row.recordedAt | date: 'short' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </mat-card>
    </ng-container>
    <ng-template #loadingTpl>
      <p>Loading device details...</p>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: grid;
        gap: 12px;
      }
      table {
        width: 100%;
      }
    `,
  ],
})
export class DeviceDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  protected device:
    | {
        id: string;
        name: string;
        ip: string;
        vendor?: string | null;
        type?: string | null;
        zabbixHostId?: string | null;
      }
    | undefined;
  protected metrics: Array<{ itemKey: string; valueText?: string; valueNumeric?: number; recordedAt: string }> =
    [];
  protected columns = ['itemKey', 'valueText', 'recordedAt'];

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.getDevice(id).subscribe({
      next: (response) => {
        this.device = response.data;
        this.metrics = (response.data.metrics as Array<{
          itemKey: string;
          valueText?: string;
          valueNumeric?: number;
          recordedAt: string;
        }>) ?? [];
      },
    });
  }
}
