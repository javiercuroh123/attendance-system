import { Routes } from '@angular/router';
import { authGuard, loginRedirectGuard } from './core/auth/auth.guard';

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
        data: { title: 'Dashboard', subtitle: 'Resumen del día' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'employees',
        data: { title: 'Empleados', subtitle: 'Gestión del personal' },
        loadComponent: () =>
          import('./features/employees/employees.page').then(
            (m) => m.EmployeesPage,
          ),
      },
      {
        path: 'schedules',
        data: { title: 'Horarios', subtitle: 'Turnos y tolerancias' },
        loadComponent: () =>
          import('./features/schedules/schedules.page').then(
            (m) => m.SchedulesPage,
          ),
      },
      {
        path: 'attendance',
        data: { title: 'Asistencia', subtitle: 'Control diario del personal' },
        loadComponent: () =>
          import('./features/attendance/attendance.page').then(
            (m) => m.AttendancePage,
          ),
      },
      {
        path: 'incidents',
        data: { title: 'Incidencias', subtitle: 'Regularizaciones y permisos' },
        loadComponent: () =>
          import('./features/incidents/incidents.page').then(
            (m) => m.IncidentsPage,
          ),
      },
      {
        path: 'reports',
        data: { title: 'Reportes', subtitle: 'Indicadores y exportaciones' },
        loadComponent: () =>
          import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'qr-sessions',
        data: { title: 'Sesiones QR', subtitle: 'Generación y control de códigos' },
        loadComponent: () =>
          import('./features/qr-sessions/qr-sessions.page').then(
            (m) => m.QrSessionsPage,
          ),
      },
      {
        path: 'audit',
        data: { title: 'Auditoría', subtitle: 'Trazabilidad de cambios' },
        loadComponent: () =>
          import('./features/audit/audit.page').then((m) => m.AuditPage),
      },
      {
        path: 'settings',
        data: { title: 'Configuración', subtitle: 'Parámetros globales' },
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
