import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AppRole, getUserRoles, hasAnyRole } from '../../core/auth/role-access';

interface NavLink {
  route: string;
  label: string;
  icon: string;
  section: 'ROOT' | 'MANAGEMENT' | 'OPERATIONS' | 'SYSTEM';
  roles: readonly AppRole[];
  exact?: boolean;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  private readonly navLinks: NavLink[] = [
    {
      route: '/dashboard',
      label: 'Dashboard',
      icon: '▤',
      section: 'ROOT',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR', 'EMPLOYEE'],
      exact: true,
    },
    {
      route: '/users',
      label: 'Usuarios',
      icon: '◫',
      section: 'MANAGEMENT',
      roles: ['ADMIN'],
    },
    {
      route: '/employees',
      label: 'Empleados',
      icon: '◈',
      section: 'MANAGEMENT',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
    },
    {
      route: '/schedules',
      label: 'Horarios',
      icon: '◷',
      section: 'MANAGEMENT',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
    },
    {
      route: '/attendance',
      label: 'Asistencia',
      icon: '◎',
      section: 'MANAGEMENT',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR', 'EMPLOYEE'],
    },
    {
      route: '/incidents',
      label: 'Incidencias',
      icon: '◇',
      section: 'MANAGEMENT',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR', 'EMPLOYEE'],
    },
    {
      route: '/qr-sessions',
      label: 'Sesiones QR',
      icon: '⊞',
      section: 'OPERATIONS',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
    },
    {
      route: '/reports',
      label: 'Reportes',
      icon: '◰',
      section: 'OPERATIONS',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
    },
    {
      route: '/audit',
      label: 'Auditoría',
      icon: '◱',
      section: 'OPERATIONS',
      roles: ['ADMIN', 'RRHH'],
    },
    {
      route: '/settings',
      label: 'Configuración',
      icon: '◉',
      section: 'SYSTEM',
      roles: ['ADMIN', 'RRHH', 'SUPERVISOR'],
    },
  ];

  readonly sidebarOpen = signal(false);
  readonly session = this.authSession.session;
  readonly topbarDate = this.formatTopbarDate(new Date());
  readonly userRoles = computed(() => getUserRoles(this.session()?.user));
  readonly rootLinks = computed(() => this.filterNavLinks('ROOT'));
  readonly managementLinks = computed(() => this.filterNavLinks('MANAGEMENT'));
  readonly operationLinks = computed(() => this.filterNavLinks('OPERATIONS'));
  readonly systemLinks = computed(() => this.filterNavLinks('SYSTEM'));

  private readonly routeDataSignal = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.getCurrentRouteData(this.router.routerState.snapshot.root)),
    ),
    { initialValue: { title: 'Dashboard', subtitle: 'Resumen del día' } },
  );

  readonly pageTitle = computed(
    () => this.routeDataSignal()?.title ?? 'Dashboard',
  );
  readonly pageSubtitle = computed(
    () => this.routeDataSignal()?.subtitle ?? 'Resumen del día',
  );

  readonly userEmail = computed(
    () => this.session()?.user.email ?? 'admin@pedsar.com',
  );

  readonly userRole = computed(
    () => this.userRoles()[0] ?? 'NO_ROLE',
  );

  readonly userInitials = computed(() => {
    const email = this.userEmail();
    const base = email.split('@')[0] ?? 'admin';
    const clean = base.replace(/[^a-zA-Z0-9]/g, '');
    return clean.slice(0, 2).toUpperCase();
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((current) => !current);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authSession.clearSession();
    void this.router.navigateByUrl('/auth/login');
  }

  private formatTopbarDate(date: Date): string {
    const formatter = new Intl.DateTimeFormat('es-PE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return formatter.format(date);
  }

  private filterNavLinks(section: NavLink['section']): NavLink[] {
    return this.navLinks.filter(
      (item) => item.section === section && hasAnyRole(this.userRoles(), item.roles),
    );
  }

  private getCurrentRouteData(route: ActivatedRouteSnapshot): {
    title: string;
    subtitle: string;
  } {
    let current = route;

    while (current.firstChild) {
      current = current.firstChild;
    }

    return {
      title: current.data['title'] ?? 'Dashboard',
      subtitle: current.data['subtitle'] ?? 'Resumen del día',
    };
  }
}
