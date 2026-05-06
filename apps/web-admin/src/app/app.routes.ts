import { Routes } from '@angular/router';
import { authGuard, loginRedirectGuard, rolesGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'auth/login',
    canActivate: [loginRedirectGuard],
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        canActivate: [rolesGuard],
        data: {
          title: 'Dashboard',
          subtitle: 'Resumen del día',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR', 'EMPLOYEE'],
        },
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'users',
        canActivate: [rolesGuard],
        data: { title: 'Usuarios', subtitle: 'users', roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/users/users.page').then((m) => m.UsersPage),
      },
      {
        path: 'employees',
        canActivate: [rolesGuard],
        data: {
          title: 'Empleados',
          subtitle: 'employees',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
        },
        loadComponent: () =>
          import('./features/employees/employees.page').then(
            (m) => m.EmployeesPage,
          ),
      },
      {
        path: 'schedules',
        canActivate: [rolesGuard],
        data: {
          title: 'Horarios',
          subtitle: 'work_schedules',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
        },
        loadComponent: () =>
          import('./features/schedules/schedules.page').then(
            (m) => m.SchedulesPage,
          ),
      },
      {
        path: 'attendance',
        canActivate: [rolesGuard],
        data: {
          title: 'Asistencia',
          subtitle: 'attendance_records',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR', 'EMPLOYEE'],
        },
        loadComponent: () =>
          import('./features/attendance/attendance.page').then(
            (m) => m.AttendancePage,
          ),
      },
      {
        path: 'incidents',
        canActivate: [rolesGuard],
        data: {
          title: 'Incidencias',
          subtitle: 'incident_requests',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR', 'EMPLOYEE'],
        },
        loadComponent: () =>
          import('./features/incidents/incidents.page').then(
            (m) => m.IncidentsPage,
          ),
      },
      {
        path: 'reports',
        canActivate: [rolesGuard],
        data: {
          title: 'Reportes',
          subtitle: 'Indicadores y exportaciones',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
        },
        loadComponent: () =>
          import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'qr-sessions',
        canActivate: [rolesGuard],
        data: {
          title: 'Sesiones QR',
          subtitle: 'qr_sessions',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
        },
        loadComponent: () =>
          import('./features/qr-sessions/qr-sessions.page').then(
            (m) => m.QrSessionsPage,
          ),
      },
      {
        path: 'audit',
        canActivate: [rolesGuard],
        data: {
          title: 'Auditoría',
          subtitle: 'audit_logs',
          roles: ['ADMIN', 'RRHH'],
        },
        loadComponent: () =>
          import('./features/audit/audit.page').then((m) => m.AuditPage),
      },
      {
        path: 'settings',
        canActivate: [rolesGuard],
        data: {
          title: 'Configuración',
          subtitle: 'system_settings',
          roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
        },
        loadComponent: () =>
          import('./features/settings/settings.page').then(
            (m) => m.SettingsPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
