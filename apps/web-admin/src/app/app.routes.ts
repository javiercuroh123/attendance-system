import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'employees',
    loadComponent: () =>
      import('./features/employees/employees.page').then((m) => m.EmployeesPage),
  },
  {
    path: 'schedules',
    loadComponent: () =>
      import('./features/schedules/schedules.page').then((m) => m.SchedulesPage),
  },
  {
    path: 'attendance',
    loadComponent: () =>
      import('./features/attendance/attendance.page').then(
        (m) => m.AttendancePage,
      ),
  },
  {
    path: 'incidents',
    loadComponent: () =>
      import('./features/incidents/incidents.page').then((m) => m.IncidentsPage),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./features/reports/reports.page').then((m) => m.ReportsPage),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
