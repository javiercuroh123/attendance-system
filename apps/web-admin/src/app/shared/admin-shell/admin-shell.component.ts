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

  readonly sidebarOpen = signal(false);
  readonly session = this.authSession.session;
  readonly topbarDate = this.formatTopbarDate(new Date());

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
    () => this.session()?.user.email ?? 'admin@consultora.com',
  );

  readonly userRole = computed(
    () =>
      (
        this.session()?.user.role ??
        this.session()?.user.roles[0] ??
        'ADMIN'
      ).toUpperCase(),
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
