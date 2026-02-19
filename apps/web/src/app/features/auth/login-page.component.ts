import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
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
        <h1>Sign In</h1>
        <p>Use your corporate account to access network management.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
            <mat-error *ngIf="form.controls.email.invalid">Valid email is required.</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" />
            <mat-error *ngIf="form.controls.password.invalid">Password is required.</mat-error>
          </mat-form-field>
          <button mat-flat-button color="primary" [disabled]="form.invalid || pending" type="submit">
            {{ pending ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
        <div class="links">
          <a routerLink="/auth/register">Create account</a>
          <a routerLink="/auth/request-reset">Forgot password?</a>
        </div>
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
      form {
        display: grid;
        gap: 10px;
      }
      .links {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected pending = false;
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit() {
    if (this.form.invalid || this.pending) return;
    this.pending = true;
    this.auth.login(this.form.getRawValue()).subscribe({
      next: async () => {
        this.pending = false;
        await this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.pending = false;
        this.snackBar.open('Invalid credentials or account is not verified.', 'Close', {
          duration: 4000,
        });
      },
    });
  }
}
