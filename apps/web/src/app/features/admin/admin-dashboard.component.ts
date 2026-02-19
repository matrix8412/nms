import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSnackBarModule],
  template: `
    <section class="grid">
      <mat-card>
        <h2>Admin Overview</h2>
        <p>Manage users, groups, and device inventory from the admin panel.</p>
        <button mat-flat-button color="primary" type="button" (click)="syncNow()" [disabled]="pending">
          {{ pending ? 'Enqueuing...' : 'Run Zabbix Sync Now' }}
        </button>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .grid {
        display: grid;
        gap: 12px;
      }
    `,
  ],
})
export class AdminDashboardComponent {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  protected pending = false;

  protected syncNow() {
    if (this.pending) return;
    this.pending = true;
    this.api.triggerZabbixSync().subscribe({
      next: (response) => {
        this.pending = false;
        this.snackBar.open(`Enqueued ${response.enqueued} sync jobs.`, 'Close', { duration: 4000 });
      },
      error: () => {
        this.pending = false;
        this.snackBar.open('Failed to enqueue sync jobs.', 'Close', { duration: 4000 });
      },
    });
  }
}
