import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  template: `
    <mat-card>
      <h1>Users</h1>
      <table mat-table [dataSource]="rows">
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let row">{{ row.email }}</td>
        </ng-container>

        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Role</th>
          <td mat-cell *matCellDef="let row">{{ row.role }}</td>
        </ng-container>

        <ng-container matColumnDef="verified">
          <th mat-header-cell *matHeaderCellDef>Verified</th>
          <td mat-cell *matCellDef="let row">{{ row.emailVerifiedAt ? 'Yes' : 'No' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </mat-card>
  `,
  styles: [
    `
      table {
        width: 100%;
      }
    `,
  ],
})
export class AdminUsersPageComponent {
  private readonly api = inject(ApiService);
  protected readonly columns = ['email', 'role', 'verified'];
  protected rows: Array<{ email: string; role: string; emailVerifiedAt?: string | null }> = [];

  constructor() {
    this.api.getAdminUsers().subscribe({
      next: (response) => {
        this.rows = response.data as Array<{ email: string; role: string; emailVerifiedAt?: string | null }>;
      },
    });
  }
}
