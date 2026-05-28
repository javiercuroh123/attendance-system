import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import {
  ScheduleCreatePayload,
  ScheduleResponse,
  SchedulesApiService,
  ScheduleUpdatePayload,
} from './schedules-api.service';

interface ScheduleRowView {
  id: string;
  code: string;
  name: string;
  start: string;
  end: string;
  tolerance: string;
  days: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Component({
  selector: 'app-schedules-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedules.page.html',
  styleUrl: './schedules.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesPage {
  private readonly schedulesApi = inject(SchedulesApiService);
  private readonly authSession = inject(AuthSessionService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly formErrorMessage = signal<string | null>(null);

  readonly schedulesRaw = signal<ScheduleResponse[]>([]);
  readonly editingScheduleId = signal('');

  readonly formName = signal('');
  readonly formCode = signal('');
  readonly formTolerance = signal('10');
  readonly formStartTime = signal('08:00');
  readonly formEndTime = signal('17:00');
  readonly formWorkDays = signal('MON,TUE,WED,THU,FRI');
  readonly formStatus = signal<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  readonly workDayOptions = [
    { value: 'MON,TUE,WED,THU,FRI', label: 'Lunes a Viernes' },
    { value: 'MON,TUE,WED,THU,FRI,SAT', label: 'Lunes a Sábado' },
    { value: 'MON,TUE,WED,THU,FRI,SAT,SUN', label: 'Todos los días' },
    { value: 'SAT,SUN', label: 'Fin de semana' },
  ];

  readonly canManageSchedules = computed(() => {
    const roles = this.getRoles();
    return roles.includes('ADMIN') || roles.includes('RRHH');
  });

  readonly isEditMode = computed(() => Boolean(this.editingScheduleId()));

  readonly rows = computed<ScheduleRowView[]>(() =>
    this.schedulesRaw().map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      start: this.shortTime(row.start_time),
      end: this.shortTime(row.end_time),
      tolerance: `${row.tolerance_minutes} min`,
      days: this.humanizeWorkDays(row.work_days),
      status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })),
  );

  constructor() {
    this.loadSchedules();
  }

  refresh(): void {
    this.loadSchedules();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' };
    return map[status] ?? status;
  }

  startCreateMode(): void {
    if (!this.canManageSchedules()) return;
    this.editingScheduleId.set('');
    this.resetForm();
    this.formErrorMessage.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  startEditMode(scheduleId: string): void {
    if (!this.canManageSchedules()) return;

    const schedule = this.schedulesRaw().find((row) => row.id === scheduleId);
    if (!schedule) return;

    this.editingScheduleId.set(schedule.id);
    this.formName.set(schedule.name);
    this.formCode.set(schedule.code);
    this.formTolerance.set(String(schedule.tolerance_minutes));
    this.formStartTime.set(this.shortTime(schedule.start_time));
    this.formEndTime.set(this.shortTime(schedule.end_time));
    this.formWorkDays.set(schedule.work_days);
    this.formStatus.set(schedule.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
    this.formErrorMessage.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  cancelForm(): void {
    this.startCreateMode();
  }

  saveSchedule(): void {
    if (!this.canManageSchedules()) {
      this.errorMessage.set('No tienes permisos para guardar horarios.');
      return;
    }

    if (this.isSaving()) return;

    const payload = this.buildPayload();
    if (!payload) return;

    this.isSaving.set(true);
    this.formErrorMessage.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request$ = this.isEditMode()
      ? this.schedulesApi.updateSchedule(this.editingScheduleId(), payload as ScheduleUpdatePayload)
      : this.schedulesApi.createSchedule(payload as ScheduleCreatePayload);

    request$
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          const message = this.isEditMode()
            ? 'Horario actualizado correctamente.'
            : 'Horario creado correctamente.';
          this.startCreateMode();
          this.successMessage.set(message);
          this.loadSchedules();
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private loadSchedules(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.schedulesApi
      .getSchedules()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (rows) => {
          this.schedulesRaw.set(rows);
          if (!this.editingScheduleId() && rows.length === 0) {
            this.resetForm();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private buildPayload(): ScheduleCreatePayload | ScheduleUpdatePayload | null {
    const name = this.formName().trim();
    const code = this.formCode().trim();
    const toleranceRaw = this.formTolerance().trim();
    const startTimeRaw = this.formStartTime().trim();
    const endTimeRaw = this.formEndTime().trim();
    const workDays = this.formWorkDays().trim();
    const status = this.formStatus();

    if (!name) {
      this.formErrorMessage.set('El nombre del turno es obligatorio.');
      return null;
    }
    if (!code) {
      this.formErrorMessage.set('El código es obligatorio.');
      return null;
    }

    const toleranceMinutes = Number(toleranceRaw);
    if (!Number.isInteger(toleranceMinutes) || toleranceMinutes < 0) {
      this.formErrorMessage.set('La tolerancia debe ser un número entero mayor o igual a 0.');
      return null;
    }

    const startTime = this.normalizeTime(startTimeRaw);
    if (!startTime) {
      this.formErrorMessage.set('Hora de entrada inválida. Usa formato HH:mm.');
      return null;
    }

    const endTime = this.normalizeTime(endTimeRaw);
    if (!endTime) {
      this.formErrorMessage.set('Hora de salida inválida. Usa formato HH:mm.');
      return null;
    }

    if (!workDays) {
      this.formErrorMessage.set('Selecciona los días laborables.');
      return null;
    }

    this.formErrorMessage.set(null);

    return {
      code,
      name,
      startTime,
      endTime,
      toleranceMinutes,
      workDays,
      status,
    };
  }

  private normalizeTime(value: string): string | null {
    if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
    return null;
  }

  private shortTime(value: string): string {
    if (!value) return '--:--';
    return value.slice(0, 5);
  }

  private humanizeWorkDays(value: string): string {
    const normalized = value.toUpperCase();
    const dictionary: Record<string, string> = {
      'MON,TUE,WED,THU,FRI': 'Lun–Vie',
      'MON,TUE,WED,THU,FRI,SAT': 'Lun–Sáb',
      'MON,TUE,WED,THU,FRI,SAT,SUN': 'Lun–Dom',
      'SAT,SUN': 'Sáb–Dom',
    };
    return dictionary[normalized] ?? normalized;
  }

  private resetForm(): void {
    this.formName.set('');
    this.formCode.set('');
    this.formTolerance.set('10');
    this.formStartTime.set('08:00');
    this.formEndTime.set('17:00');
    this.formWorkDays.set('MON,TUE,WED,THU,FRI');
    this.formStatus.set('ACTIVE');
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' · ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No se pudo completar la operación de horarios.';
  }

  private getRoles(): string[] {
    const session = this.authSession.session();
    if (!session) return [];

    const fromRoles = session.user.roles ?? [];
    const fromRole = session.user.role ? [session.user.role] : [];
    return Array.from(new Set([...fromRoles, ...fromRole].map((item) => item.toUpperCase())));
  }
}
