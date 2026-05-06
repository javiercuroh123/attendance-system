import { AuthSession, AuthUser } from './auth.models';

export type AppRole = 'ADMIN' | 'RRHH' | 'SUPERVISOR' | 'EMPLOYEE';

const HOME_ROUTE_BY_ROLE: Record<AppRole, string> = {
  ADMIN: '/dashboard',
  RRHH: '/dashboard',
  SUPERVISOR: '/dashboard',
  EMPLOYEE: '/dashboard',
};

const ROLE_PRIORITY: AppRole[] = ['ADMIN', 'RRHH', 'SUPERVISOR', 'EMPLOYEE'];

function normalizeRole(value: string | null | undefined): AppRole | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (
    normalized === 'ADMIN' ||
    normalized === 'RRHH' ||
    normalized === 'SUPERVISOR' ||
    normalized === 'EMPLOYEE'
  ) {
    return normalized;
  }
  return null;
}

export function getUserRoles(
  user: Pick<AuthUser, 'role' | 'roles'> | null | undefined,
): AppRole[] {
  if (!user) return [];

  const roleCandidates = [...(user.roles ?? []), user.role ?? ''];
  const normalized = roleCandidates
    .map((role) => normalizeRole(role))
    .filter((role): role is AppRole => role !== null);

  return Array.from(new Set(normalized));
}

export function hasAnyRole(
  userRoles: readonly AppRole[],
  allowedRoles: readonly AppRole[],
): boolean {
  return allowedRoles.some((role) => userRoles.includes(role));
}

export function getDefaultRouteForUser(
  user: Pick<AuthUser, 'role' | 'roles'> | null | undefined,
): string {
  const roles = getUserRoles(user);
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return HOME_ROUTE_BY_ROLE[role];
    }
  }
  return '/dashboard';
}

export function getDefaultRouteForSession(session: AuthSession | null): string {
  if (!session) return '/auth/login';
  return getDefaultRouteForUser(session.user);
}
