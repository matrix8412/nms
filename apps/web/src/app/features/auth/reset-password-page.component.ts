import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password-page',
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
        <h1>Set New Password</h1>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>New password</mat-label>
            <input matInput type="password" formControlName="password" />
            <mat-hint>Minimum 12 characters.</mat-hint>
          </mat-form-field>
          <button mat-flat-button color="primary" [disabled]="form.invalid || pending" type="submit">
            {{ pending ? 'Updating...' : 'Update password' }}
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
export class ResetPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected pending = false;
  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(12)]],
  });

  protected submit() {
    const email = this.route.snapshot.queryParamMap.get('email');
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!email || !token || this.form.invalid || this.pending) return;

    this.pending = true;
    this.auth
      .resetPassword({
        email,
        token,
        password: this.form.controls.password.value,
      })
      .subscribe({
        next: async () => {
          this.pending = false;
          this.snackBar.open('Password updated. You can login now.', 'Close', { duration: 4000 });
          await this.router.navigateByUrl('/auth/login');
        },
        error: () => {
          this.pending = false;
          this.snackBar.open('Reset token is invalid or expired.', 'Close', { duration: 4000 });
        },
      });
  }
}
