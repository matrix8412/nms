import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-admin-groups-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <section class="grid">
      <mat-card>
        <h1>User Groups</h1>
        <ul>
          <li *ngFor="let group of groups">{{ group.name }}</li>
        </ul>
      </mat-card>

      <mat-card>
        <h1>Device Groups</h1>
        <ul>
          <li *ngFor="let group of deviceGroups">{{ group.name || group.id }}</li>
        </ul>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @media (max-width: 900px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminGroupsPageComponent {
  private readonly api = inject(ApiService);

  protected groups: Array<{ id: string; name: string }> = [];
  protected deviceGroups: Array<{ id: string; name?: string | null }> = [];

  constructor() {
    this.api.getGroups().subscribe({
      next: (response) => (this.groups = response.data),
    });
    this.api.getDeviceGroups().subscribe({
      next: (response) =>
        (this.deviceGroups = response.data as Array<{ id: string; name?: string | null }>),
    });
  }
}
