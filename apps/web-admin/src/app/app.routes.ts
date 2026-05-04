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
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'employees',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/employees/employees.page').then((m) => m.EmployeesPage),
  },
  {
    path: 'schedules',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/schedules/schedules.page').then((m) => m.SchedulesPage),
  },
  {
    path: 'attendance',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/attendance/attendance.page').then(
        (m) => m.AttendancePage,
      ),
  },
  {
    path: 'incidents',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/incidents/incidents.page').then((m) => m.IncidentsPage),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reports/reports.page').then((m) => m.ReportsPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
