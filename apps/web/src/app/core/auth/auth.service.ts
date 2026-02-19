import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { AuthUserDto } from '@nms/shared';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { Router } from '@angular/router';
import { CsrfService } from './csrf.service';

type AuthMeResponse = {
  authenticated: boolean;
  user: AuthUserDto;
  csrfToken?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly csrfService = inject(CsrfService);

  private readonly userSubject = new BehaviorSubject<AuthUserDto | null>(null);
  readonly user$ = this.userSubject.asObservable();
  readonly isAuthenticated$ = this.user$.pipe(map((user) => !!user));
  readonly isAdmin$ = this.user$.pipe(map((user) => user?.role === 'ADMIN'));

  bootstrapSession(): Observable<AuthUserDto | null> {
    return this.http.get<AuthMeResponse>('/api/auth/me', { withCredentials: true }).pipe(
      tap((response) => {
        this.userSubject.next(response.user);
        this.csrfService.setToken(response.csrfToken);
      }),
      map((response) => response.user),
      catchError(() => {
        this.userSubject.next(null);
        return of(null);
      }),
    );
  }

  register(payload: { email: string; password: string }) {
    return this.http.post<{ ok: boolean; message: string }>('/api/auth/register', payload, {
      withCredentials: true,
    });
  }

  login(payload: { email: string; password: string }) {
    return this.http
      .post<{ ok: boolean; user: AuthUserDto; csrfToken?: string }>('/api/auth/login', payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.userSubject.next(response.user);
          this.csrfService.setToken(response.csrfToken);
        }),
      );
  }

  logout() {
    return this.http.post<{ ok: boolean }>('/api/auth/logout', {}, { withCredentials: true }).pipe(
      tap(async () => {
        this.userSubject.next(null);
        await this.router.navigateByUrl('/auth/login');
      }),
    );
  }

  requestReset(payload: { email: string }) {
    return this.http.post<{ ok: boolean; message: string }>('/api/auth/password/request-reset', payload, {
      withCredentials: true,
    });
  }

  resetPassword(payload: { email: string; token: string; password: string }) {
    return this.http.post<{ ok: boolean }>('/api/auth/password/reset', payload, {
      withCredentials: true,
    });
  }

  currentUser(): AuthUserDto | null {
    return this.userSubject.value;
  }
}
