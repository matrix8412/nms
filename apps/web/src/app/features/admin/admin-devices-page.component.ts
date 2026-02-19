import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import type { DeviceDto } from '@nms/shared';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-admin-devices-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSnackBarModule],
  template: `
    <mat-card>
      <h1>Device Inventory Management</h1>
      <p>Total devices: {{ devices.length }}</p>
      <button mat-flat-button color="primary" (click)="syncAll()" [disabled]="syncPending">
        {{ syncPending ? 'Enqueuing...' : 'Sync All Devices' }}
      </button>
      <ul>
        <li *ngFor="let device of devices">
          {{ device.name }} ({{ device.ip }}) - {{ device.vendor || '-' }} / {{ device.type || '-' }}
        </li>
      </ul>
    </mat-card>
  `,
})
export class AdminDevicesPageComponent {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected devices: DeviceDto[] = [];
  protected syncPending = false;

  constructor() {
    this.api.getDevices().subscribe({
      next: (response) => (this.devices = response.data),
    });
  }

  protected syncAll() {
    if (this.syncPending) return;
    this.syncPending = true;
    this.api.triggerZabbixSync(this.devices.map((device) => device.id)).subscribe({
      next: (response) => {
        this.syncPending = false;
        this.snackBar.open(`Enqueued ${response.enqueued} jobs.`, 'Close', { duration: 3000 });
      },
      error: () => {
        this.syncPending = false;
        this.snackBar.open('Failed to enqueue sync jobs.', 'Close', { duration: 3000 });
      },
    });
  }
}
