import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const session = inject(AuthSessionService);

  if (session.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      redirect: state.url,
    },
  });
};

export const loginRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(AuthSessionService);

  if (session.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
