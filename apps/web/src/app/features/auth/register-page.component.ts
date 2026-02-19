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
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <main class="auth-wrap">
      <mat-card class="auth-card">
        <h1>Create Account</h1>
        <p>Registration is limited to <strong>@kinet.sk</strong> email domain.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" />
            <mat-hint>Minimum 12 characters.</mat-hint>
          </mat-form-field>
          <button mat-flat-button color="primary" [disabled]="form.invalid || pending" type="submit">
            {{ pending ? 'Submitting...' : 'Register' }}
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
        width: min(100%, 440px);
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
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected pending = false;
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
  });

  protected submit() {
    if (this.form.invalid || this.pending) return;
    this.pending = true;
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.pending = false;
        this.snackBar.open('Registration completed. Verify your email to login.', 'Close', {
          duration: 4500,
        });
      },
      error: (error) => {
        this.pending = false;
        this.snackBar.open(error?.error?.message ?? 'Registration failed.', 'Close', {
          duration: 4500,
        });
      },
    });
  }
}
