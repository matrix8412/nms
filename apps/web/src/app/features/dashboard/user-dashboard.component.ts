import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <section class="grid">
      <mat-card>
        <h2>Welcome</h2>
        <p>{{ email }}</p>
        <p><strong>Role:</strong> {{ role }}</p>
      </mat-card>
      <mat-card>
        <h2>Your Groups</h2>
        <p>{{ groupCount }} assigned group(s)</p>
      </mat-card>
      <mat-card>
        <h2>Visible Devices</h2>
        <p>{{ deviceCount }} devices available</p>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
      @media (max-width: 1100px) {
        .grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 700px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UserDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  protected email = this.auth.currentUser()?.email ?? '';
  protected role = this.auth.currentUser()?.role ?? 'USER';
  protected groupCount = this.auth.currentUser()?.groups.length ?? 0;
  protected deviceCount = 0;

  constructor() {
    this.api.getDevices().subscribe({
      next: (response) => (this.deviceCount = response.data.length),
      error: () => (this.deviceCount = 0),
    });
  }
}
