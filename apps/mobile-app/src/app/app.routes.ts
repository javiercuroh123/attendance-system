import { Routes } from '@angular/router';
import { authGuard, loginRedirectGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
    canActivate: [loginRedirectGuard],
  },
  {
    path: 'scan',
    loadComponent: () => import('./scan/scan.page').then((m) => m.ScanPage),
    canActivate: [authGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./tabs-shell/tabs-shell.page').then((m) => m.TabsShellPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'my-attendance',
        loadComponent: () =>
          import('./my-attendance/my-attendance.page').then(
            (m) => m.MyAttendancePage,
          ),
      },
      {
        path: 'incidents',
        loadComponent: () =>
          import('./incidents/incidents.page').then((m) => m.IncidentsPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
