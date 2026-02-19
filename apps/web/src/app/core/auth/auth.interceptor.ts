import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, defer, from, switchMap, throwError } from 'rxjs';
import { CsrfService } from './csrf.service';

const STATE_CHANGING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const csrf = inject(CsrfService);
  const router = inject(Router);

  return defer(() => {
    if (!STATE_CHANGING.has(req.method.toUpperCase())) {
      return next(req.clone({ withCredentials: true }));
    }

    return from(csrf.ensureToken()).pipe(
      switchMap((token) =>
        next(
          req.clone({
            withCredentials: true,
            setHeaders: { 'X-CSRF-Token': token },
          }),
        ),
      ),
    );
  }).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        router.navigateByUrl('/auth/login').catch(() => undefined);
      }
      return throwError(() => error);
    }),
  );
};
