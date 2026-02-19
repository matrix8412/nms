import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule],
  template: `
    <main class="auth-wrap">
      <mat-card class="auth-card">
        <h1>Email Verification</h1>
        <p *ngIf="status === 'loading'">Verifying your account...</p>
        <p *ngIf="status === 'success'">Email verified. You can now login.</p>
        <p *ngIf="status === 'error'">Verification link is invalid or expired.</p>
        <a mat-flat-button color="primary" routerLink="/auth/login">Go to login</a>
      </mat-card>
    </main>
  `,
  styles: [
    `
      .auth-wrap {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 16px;
      }
      .auth-card {
        width: min(100%, 420px);
        display: grid;
        gap: 14px;
      }
    `,
  ],
})
export class VerifyEmailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  protected status: 'loading' | 'success' | 'error' = 'loading';

  constructor() {
    const email = this.route.snapshot.queryParamMap.get('email');
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!email || !token) {
      this.status = 'error';
      return;
    }
    this.http
      .get('/api/auth/verify-email', {
        params: { email, token },
        withCredentials: true,
      })
      .subscribe({
        next: () => (this.status = 'success'),
        error: () => (this.status = 'error'),
      });
  }
}
