import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import type { DeviceDto } from '@nms/shared';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-device-list-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <section class="head">
      <h1>Devices</h1>
      <mat-form-field appearance="outline">
        <mat-label>Search by name, IP, vendor, type</mat-label>
        <input matInput [formControl]="searchControl" />
      </mat-form-field>
    </section>

    <p *ngIf="loading">Loading devices...</p>
    <section class="device-grid" *ngIf="!loading">
      <mat-card *ngFor="let device of devices">
        <h2>{{ device.name }}</h2>
        <p><strong>IP:</strong> {{ device.ip }}</p>
        <p><strong>Vendor:</strong> {{ device.vendor || '-' }}</p>
        <p><strong>Type:</strong> {{ device.type || '-' }}</p>
        <a mat-stroked-button color="primary" [routerLink]="['/devices', device.id]">Details</a>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .head {
        display: grid;
        gap: 12px;
        margin-bottom: 12px;
      }
      .head mat-form-field {
        width: min(100%, 580px);
      }
      .device-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      @media (max-width: 1200px) {
        .device-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 760px) {
        .device-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DeviceListPageComponent {
  private readonly api = inject(ApiService);

  protected devices: DeviceDto[] = [];
  protected loading = true;
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.refresh();
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => this.refresh(value));
  }

  private refresh(query = '') {
    this.loading = true;
    this.api.getDevices(query).subscribe({
      next: (response) => {
        this.devices = response.data;
        this.loading = false;
      },
      error: () => {
        this.devices = [];
        this.loading = false;
      },
    });
  }
}
