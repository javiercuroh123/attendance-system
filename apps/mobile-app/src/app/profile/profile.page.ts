import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  businessOutline,
  calendarOutline,
  callOutline,
  chevronForwardOutline,
  codeSlashOutline,
  idCardOutline,
  informationCircleOutline,
  keyOutline,
  logOutOutline,
  mailOutline,
  timeOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { EmployeesApiService } from '../core/api/employees-api.service';
import { AuthApiService } from '../core/auth/auth-api.service';
import { AuthSessionService } from '../core/auth/auth-session.service';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonContent, IonIcon, NgIf, PageHeaderComponent],
})
export class ProfilePage implements OnInit {
  protected employeeInitials = 'EM';
  protected employeeName = 'Empleado';
  protected employeeRole = 'Empleado';
  protected isLoading = false;
  protected errorMessage: string | null = null;

  protected profile = {
    dni: 'No disponible',
    email: 'No disponible',
    phone: 'No disponible',
    code: 'No disponible',
    position: 'No disponible',
    area: 'No disponible',
    schedule: 'No disponible',
    hireDate: 'No disponible',
  };

  constructor(
    private readonly employeesApi: EmployeesApiService,
    private readonly authApi: AuthApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {
    addIcons({
      idCardOutline,
      mailOutline,
      callOutline,
      codeSlashOutline,
      briefcaseOutline,
      businessOutline,
      timeOutline,
      calendarOutline,
      keyOutline,
      informationCircleOutline,
      logOutOutline,
      chevronForwardOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  protected onUtilityAction(): void {
    // Placeholder intencional para acciones futuras del perfil.
  }

  protected async logout(): Promise<void> {
    try {
      await firstValueFrom(this.authApi.logout());
    } catch {
      // Si logout falla por red, igual cerramos sesion localmente.
    } finally {
      this.session.clearSession();
      await this.router.navigateByUrl('/login');
    }
  }

  private async loadProfile(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const [employee, me] = await Promise.all([
        firstValueFrom(this.employeesApi.getMyProfile()),
        firstValueFrom(this.authApi.me()),
      ]);

      this.employeeName = `${employee.first_name} ${employee.last_name}`.trim();
      this.employeeInitials = this.buildInitials(employee.first_name, employee.last_name);
      this.employeeRole = this.roleLabel(me.role ?? employee.user.role);

      this.profile = {
        dni: employee.dni ?? 'No disponible',
        email: me.email ?? employee.user.email ?? 'No disponible',
        phone: employee.phone ?? 'No disponible',
        code: employee.code ?? 'No disponible',
        position: employee.position ?? 'No disponible',
        area: employee.area_name ?? 'No disponible',
        schedule: this.formatSchedule(
          employee.schedule?.start_time,
          employee.schedule?.end_time,
        ),
        hireDate: this.formatDate(employee.hire_date),
      };
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.session.clearSession();
        await this.router.navigateByUrl('/login');
        return;
      }

      this.errorMessage = this.resolveErrorMessage(error);

      const fallbackUser = this.session.session()?.user;
      if (fallbackUser) {
        this.profile.email = fallbackUser.email;
        this.employeeRole = this.roleLabel(fallbackUser.role);
      }
    } finally {
      this.isLoading = false;
    }
  }

  private buildInitials(first: string, last = ''): string {
    const source = `${first} ${last}`.trim();
    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return 'EM';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  private roleLabel(role?: string): string {
    if (role === 'ADMIN') {
      return 'Administrador';
    }

    if (role === 'RRHH') {
      return 'Recursos Humanos';
    }

    if (role === 'SUPERVISOR') {
      return 'Supervisor';
    }

    return 'Empleado';
  }

  private formatSchedule(start?: string, end?: string): string {
    if (!start || !end) {
      return 'No disponible';
    }

    return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return 'No disponible';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = error.error?.message;

      if (Array.isArray(backendMessage) && backendMessage.length > 0) {
        return backendMessage.join(' · ');
      }

      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }
    }

    return 'No se pudo cargar la informacion del perfil.';
  }
}
