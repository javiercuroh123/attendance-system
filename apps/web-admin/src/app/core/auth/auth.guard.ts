import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';
import {
  AppRole,
  getDefaultRouteForSession,
  getUserRoles,
  hasAnyRole,
} from './role-access';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const session = inject(AuthSessionService);

  if (session.isAuthenticated()) return true;

  return router.createUrlTree(['/auth/login'], {
    queryParams: { redirect: state.url },
  });
};

export const loginRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(AuthSessionService);

  if (session.isAuthenticated()) {
    return router.createUrlTree([getDefaultRouteForSession(session.session())]);
  }
  return true;
};

export const rolesGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(AuthSessionService);
  const currentSession = session.session();

  if (!currentSession) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { redirect: state.url },
    });
  }

  const allowedRoles = (route.data?.['roles'] as AppRole[] | undefined) ?? [];
  if (allowedRoles.length === 0) return true;

  const userRoles = getUserRoles(currentSession.user);
  if (hasAnyRole(userRoles, allowedRoles)) return true;

  const fallbackRoute = getDefaultRouteForSession(currentSession);
  if (fallbackRoute === state.url) {
    return router.createUrlTree(['/auth/login']);
  }
  return router.createUrlTree([fallbackRoute]);
};
