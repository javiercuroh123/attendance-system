import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import {
  AdminUserOption,
  AttendanceSummaryRecord,
  EmployeeCreatePayload,
  EmployeeResponse,
  EmployeesApiService,
  EmployeeUpdatePayload,
  WorkScheduleOption,
} from './employees-api.service';

type RoleFilter = 'ALL' | 'ADMIN' | 'RRHH' | 'SUPERVISOR' | 'EMPLOYEE';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type FormMode = 'CREATE' | 'EDIT';

interface EmployeeRowView {
  id: string;
  initials: string;
  name: string;
  code: string;
  dni: string;
  positionArea: string;
  schedule: string;
  role: string;
  status: string;
  attendancePct: number | null;
}

interface EmployeeFormCommonPayload {
  code: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone?: string;
  areaName?: string;
  position?: string;
  supervisorId?: string;
  scheduleId?: string;
  hireDate?: string;
  status: string;
}

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.page.html',
  styleUrl: './employees.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesPage {
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly authSession = inject(AuthSessionService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly formErrorMessage = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly roleFilter = signal<RoleFilter>('ALL');
  readonly statusFilter = signal<StatusFilter>('ALL');

  readonly employeesRaw = signal<EmployeeResponse[]>([]);
  readonly usersRaw = signal<AdminUserOption[]>([]);
  readonly schedulesRaw = signal<WorkScheduleOption[]>([]);
  readonly attendancePctByEmployee = signal<Record<string, number | null>>({});

  readonly isFormModalOpen = signal(false);
  readonly formMode = signal<FormMode>('CREATE');
  readonly editingEmployeeId = signal('');

  readonly formUserId = signal('');
  readonly formCode = signal('');
  readonly formDni = signal('');
  readonly formFirstName = signal('');
  readonly formLastName = signal('');
  readonly formPhone = signal('');
  readonly formAreaName = signal('');
  readonly formPosition = signal('');
  readonly formScheduleId = signal('NONE');
  readonly formSupervisorId = signal('NONE');
  readonly formHireDate = signal('');
  readonly formStatus = signal<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  readonly canEditEmployees = computed(() => {
    const roles = this.getRoles();
    return roles.includes('ADMIN') || roles.includes('RRHH');
  });

  readonly canCreateEmployees = computed(() => this.getRoles().includes('ADMIN'));
  readonly canLoadUsers = computed(() => this.getRoles().includes('ADMIN'));
  readonly isAdmin = computed(() => this.getRoles().includes('ADMIN'));

  readonly availableUsers = computed(() => {
    const users = this.usersRaw();
    if (this.formMode() === 'EDIT') return users;

    const linkedUserIds = new Set(this.employeesRaw().map((item) => item.user.id));
    return users.filter((user) => user.status === 'ACTIVE' && !linkedUserIds.has(user.id));
  });

  readonly supervisorOptions = computed(() =>
    this.employeesRaw()
      .filter((employee) => employee.id !== this.editingEmployeeId())
      .map((employee) => ({
        id: employee.id,
        label: `${employee.first_name} ${employee.last_name} · ${employee.code}`,
      })),
  );

  readonly rows = computed<EmployeeRowView[]>(() => {
    const attendanceMap = this.attendancePctByEmployee();
    return this.employeesRaw().map((row) => ({
      id: row.id,
      initials: this.buildInitials(row.first_name, row.last_name),
      name: `${row.first_name} ${row.last_name}`,
      code: row.code,
      dni: row.dni,
      positionArea: this.buildPositionArea(row),
      schedule: this.formatSchedule(row.schedule ?? null),
      role: (row.user.role || 'EMPLOYEE').toUpperCase(),
      status: (row.status || 'ACTIVE').toUpperCase(),
      attendancePct: attendanceMap[row.id] ?? null,
    }));
  });

  readonly filteredRows = computed<EmployeeRowView[]>(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const roleFilter = this.roleFilter();
    const statusFilter = this.statusFilter();

    return this.rows().filter((row) => {
      if (roleFilter !== 'ALL' && row.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;

      if (!query) return true;

      const source = `${row.name} ${row.code} ${row.dni} ${row.positionArea} ${row.schedule}`.toLowerCase();
      return source.includes(query);
    });
  });

  constructor() {
    this.loadEmployeesContext();
  }

  refresh(): void {
    this.loadEmployeesContext();
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setRoleFilter(value: string): void {
    if (
      value === 'ALL' ||
      value === 'ADMIN' ||
      value === 'RRHH' ||
      value === 'SUPERVISOR' ||
      value === 'EMPLOYEE'
    ) {
      this.roleFilter.set(value);
    }
  }

  setStatusFilter(value: string): void {
    if (value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE') {
      this.statusFilter.set(value);
    }
  }

  openCreateModal(): void {
    if (!this.canCreateEmployees()) {
      this.errorMessage.set('Solo ADMIN puede crear nuevos empleados.');
      return;
    }

    if (this.availableUsers().length === 0) {
      this.errorMessage.set(
        'No hay usuarios disponibles para vincular. Crea primero un usuario en el módulo de usuarios.',
      );
      return;
    }

    this.errorMessage.set(null);
    this.formErrorMessage.set(null);
    this.formMode.set('CREATE');
    this.editingEmployeeId.set('');
    this.resetForm();
    this.formUserId.set(this.availableUsers()[0]?.id ?? '');
    this.isFormModalOpen.set(true);
  }

  openEditModal(employeeId: string): void {
    if (!this.canEditEmployees()) return;

    const employee = this.employeesRaw().find((item) => item.id === employeeId);
    if (!employee) return;

    this.errorMessage.set(null);
    this.formErrorMessage.set(null);
    this.formMode.set('EDIT');
    this.editingEmployeeId.set(employee.id);

    this.formUserId.set(employee.user.id);
    this.formCode.set(employee.code);
    this.formDni.set(employee.dni);
    this.formFirstName.set(employee.first_name);
    this.formLastName.set(employee.last_name);
    this.formPhone.set(employee.phone ?? '');
    this.formAreaName.set(employee.area_name ?? '');
    this.formPosition.set(employee.position ?? '');
    this.formScheduleId.set(employee.schedule?.id ?? 'NONE');
    this.formSupervisorId.set(employee.supervisor?.id ?? 'NONE');
    this.formHireDate.set(employee.hire_date ?? '');
    this.formStatus.set(employee.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');

    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
  }

  submitForm(): void {
    if (this.isSaving()) return;

    if (this.formMode() === 'CREATE') {
      this.submitCreate();
      return;
    }

    this.submitUpdate();
  }

  private submitCreate(): void {
    const payload = this.buildCreatePayload();
    if (!payload) return;

    this.isSaving.set(true);
    this.formErrorMessage.set(null);
    this.successMessage.set(null);

    this.employeesApi
      .createEmployee(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.isFormModalOpen.set(false);
          this.successMessage.set('Empleado creado correctamente.');
          this.loadEmployeesContext();
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private submitUpdate(): void {
    const employeeId = this.editingEmployeeId();
    if (!employeeId) return;

    const payload = this.buildUpdatePayload();
    if (!payload) return;

    this.isSaving.set(true);
    this.formErrorMessage.set(null);
    this.successMessage.set(null);

    this.employeesApi
      .updateEmployee(employeeId, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.isFormModalOpen.set(false);
          this.successMessage.set('Empleado actualizado correctamente.');
          this.loadEmployeesContext();
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private buildCreatePayload(): EmployeeCreatePayload | null {
    const userId = this.formUserId().trim();
    if (!userId) {
      this.formErrorMessage.set('Selecciona un usuario para el empleado.');
      return null;
    }

    const payload = this.buildCommonPayload();
    if (!payload) return null;

    return {
      userId,
      ...payload,
    };
  }

  private buildUpdatePayload(): EmployeeUpdatePayload | null {
    const payload = this.buildCommonPayload();
    if (!payload) return null;

    const updatePayload: EmployeeUpdatePayload = { ...payload };

    if (this.isAdmin() && this.formUserId().trim()) {
      updatePayload.userId = this.formUserId().trim();
    }

    return updatePayload;
  }

  private buildCommonPayload(): EmployeeFormCommonPayload | null {
    const code = this.formCode().trim();
    const dni = this.formDni().trim();
    const firstName = this.formFirstName().trim();
    const lastName = this.formLastName().trim();

    if (!code) {
      this.formErrorMessage.set('El código del empleado es obligatorio.');
      return null;
    }
    if (!dni || !/^\d{8}$/.test(dni)) {
      this.formErrorMessage.set('El DNI debe tener exactamente 8 dígitos.');
      return null;
    }
    if (!firstName) {
      this.formErrorMessage.set('El nombre es obligatorio.');
      return null;
    }
    if (!lastName) {
      this.formErrorMessage.set('El apellido es obligatorio.');
      return null;
    }

    this.formErrorMessage.set(null);

    return {
      code,
      dni,
      firstName,
      lastName,
      phone: this.normalizeOptionalValue(this.formPhone()),
      areaName: this.normalizeOptionalValue(this.formAreaName()),
      position: this.normalizeOptionalValue(this.formPosition()),
      scheduleId:
        this.formScheduleId() !== 'NONE' ? this.formScheduleId().trim() : undefined,
      supervisorId:
        this.formSupervisorId() !== 'NONE' ? this.formSupervisorId().trim() : undefined,
      hireDate: this.normalizeOptionalValue(this.formHireDate()),
      status: this.formStatus(),
    };
  }

  private loadEmployeesContext(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const range = this.getCurrentMonthRange();

    const users$ = this.canLoadUsers()
      ? this.employeesApi.getUsers().pipe(catchError(() => of<AdminUserOption[]>([])))
      : of<AdminUserOption[]>([]);

    forkJoin({
      employees: this.employeesApi.getEmployees(),
      schedules: this.employeesApi
        .getSchedules()
        .pipe(catchError(() => of<WorkScheduleOption[]>([]))),
      users: users$,
      attendance: this.employeesApi
        .getAttendance({
          from: range.from,
          to: range.to,
        })
        .pipe(catchError(() => of<AttendanceSummaryRecord[]>([]))),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ employees, schedules, users, attendance }) => {
          this.employeesRaw.set(employees);
          this.schedulesRaw.set(schedules);
          this.usersRaw.set(users);
          this.attendancePctByEmployee.set(
            this.buildAttendancePercentageMap(employees, attendance),
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private buildAttendancePercentageMap(
    employees: EmployeeResponse[],
    attendanceRows: AttendanceSummaryRecord[],
  ): Record<string, number | null> {
    const buckets = new Map<string, { total: number; attended: number }>();

    for (const row of attendanceRows) {
      const employeeId = row.employee?.id;
      if (!employeeId) continue;

      const current = buckets.get(employeeId) ?? { total: 0, attended: 0 };
      current.total += 1;
      if (this.isCountedAsAttendance(row.status)) current.attended += 1;
      buckets.set(employeeId, current);
    }

    const output: Record<string, number | null> = {};

    for (const employee of employees) {
      const bucket = buckets.get(employee.id);
      if (!bucket || bucket.total === 0) {
        output[employee.id] = null;
        continue;
      }

      output[employee.id] = Math.round((bucket.attended / bucket.total) * 100);
    }

    return output;
  }

  private isCountedAsAttendance(status: string): boolean {
    const value = status.toUpperCase();
    return value === 'PRESENT' || value === 'LATE' || value === 'JUSTIFIED';
  }

  private buildInitials(firstName: string, lastName: string): string {
    const first = firstName.trim().charAt(0).toUpperCase();
    const last = lastName.trim().charAt(0).toUpperCase();
    return `${first}${last}`.trim() || 'NA';
  }

  private buildPositionArea(employee: EmployeeResponse): string {
    const position = (employee.position ?? '').trim();
    const area = (employee.area_name ?? '').trim();

    if (position && area) return `${position} / ${area}`;
    if (position) return position;
    if (area) return area;
    return 'Sin cargo / área';
  }

  private formatSchedule(schedule: WorkScheduleOption | null): string {
    if (!schedule) return 'Sin horario';
    const start = this.shortTime(schedule.start_time);
    const end = this.shortTime(schedule.end_time);
    return `${schedule.name} ${start}-${end}`;
  }

  private shortTime(value: string): string {
    if (!value) return '--:--';
    return value.slice(0, 5);
  }

  private normalizeOptionalValue(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  private getCurrentMonthRange(): { from: string; to: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${day}`,
    };
  }

  private resetForm(): void {
    this.formUserId.set('');
    this.formCode.set('');
    this.formDni.set('');
    this.formFirstName.set('');
    this.formLastName.set('');
    this.formPhone.set('');
    this.formAreaName.set('');
    this.formPosition.set('');
    this.formScheduleId.set('NONE');
    this.formSupervisorId.set('NONE');
    this.formHireDate.set('');
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
    return 'No se pudo completar la operación de empleados.';
  }

  private getRoles(): string[] {
    const session = this.authSession.session();
    if (!session) return [];

    const fromRoles = session.user.roles ?? [];
    const fromRole = session.user.role ? [session.user.role] : [];
    return Array.from(new Set([...fromRoles, ...fromRole].map((item) => item.toUpperCase())));
  }
}
