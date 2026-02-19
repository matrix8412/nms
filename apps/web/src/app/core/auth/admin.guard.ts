import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser()?.role === 'ADMIN') {
    return true;
  }

  return auth.bootstrapSession().pipe(
    map((user) => (user?.role === 'ADMIN' ? true : router.parseUrl('/dashboard'))),
  );
};
