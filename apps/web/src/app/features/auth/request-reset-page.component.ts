import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-request-reset-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <main class="auth-wrap">
      <mat-card class="auth-card">
        <h1>Request Password Reset</h1>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>
          <button mat-flat-button color="primary" [disabled]="form.invalid || pending" type="submit">
            {{ pending ? 'Sending...' : 'Send reset link' }}
          </button>
        </form>
        <a routerLink="/auth/login">Back to login</a>
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
        gap: 12px;
      }
      form {
        display: grid;
        gap: 10px;
      }
    `,
  ],
})
export class RequestResetPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected pending = false;
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit() {
    if (this.form.invalid || this.pending) return;
    this.pending = true;
    this.auth.requestReset(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.pending = false;
        this.snackBar.open(response.message, 'Close', { duration: 4500 });
      },
      error: () => {
        this.pending = false;
        this.snackBar.open('Unable to request password reset.', 'Close', { duration: 4500 });
      },
    });
  }
}
