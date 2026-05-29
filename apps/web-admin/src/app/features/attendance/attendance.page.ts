import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import {
  AttendanceApiService,
  AttendanceEmployee,
  AttendanceRecordResponse,
  IncidentResponse,
  ManualAdjustmentPayload,
} from './attendance-api.service';

type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'INCOMPLETE'
  | 'JUSTIFIED';

interface AttendanceRow {
  id: string | null;
  employeeId: string;
  employeeCode: string;
  initials: string;
  name: string;
  date: string;
  checkInAt: string;
  checkOutAt: string;
  workedHours: string;
  status: AttendanceStatus;
  lateMinutes: string;
  source: 'QR' | 'MANUAL' | null;
  qrSession: string | null;
}

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.page.html',
  styleUrl: './attendance.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePage {
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly authSession = inject(AuthSessionService);

  readonly isLoading = signal(false);
  readonly isApplyingManualAdjustment = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly manualErrorMessage = signal<string | null>(null);
  readonly manualSuccessMessage = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly selectedDate = signal(this.toIsoDate(new Date()));
  readonly selectedStatus = signal<'ALL' | AttendanceStatus>('ALL');

  readonly allRows = signal<AttendanceRow[]>([]);

  readonly isPrivilegedViewer = computed(() => {
    const roles = this.getRoles();
    return roles.includes('ADMIN') || roles.includes('RRHH') || roles.includes('SUPERVISOR');
  });

  readonly canManualAdjust = computed(() => {
    const roles = this.getRoles();
    return roles.includes('ADMIN') || roles.includes('RRHH');
  });

  readonly rows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const selectedStatus = this.selectedStatus();

    return this.allRows().filter((row) => {
      const passesStatus = selectedStatus === 'ALL' ? true : row.status === selectedStatus;
      if (!passesStatus) return false;

      if (!query) return true;

      const searchable = `${row.name} ${row.employeeCode} ${row.initials}`.toLowerCase();
      return searchable.includes(query);
    });
  });

  readonly recordsWithId = computed(() => this.rows().filter((row) => row.id !== null));

  readonly isManualModalOpen = signal(false);
  readonly manualFormRecordId = signal('');
  readonly manualFormCheckIn = signal('');
  readonly manualFormCheckOut = signal('');
  readonly manualFormReason = signal('');

  constructor() {
    this.loadAttendance();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onDateChange(value: string): void {
    this.selectedDate.set(value);
  }

  onStatusChange(value: string): void {
    if (
      value === 'ALL' ||
      value === 'PRESENT' ||
      value === 'LATE' ||
      value === 'ABSENT' ||
      value === 'INCOMPLETE' ||
      value === 'JUSTIFIED'
    ) {
      this.selectedStatus.set(value);
    }
  }

  applyDateFilter(): void {
    this.loadAttendance();
  }

  refreshAttendance(): void {
    this.loadAttendance();
  }

  statusClass(status: AttendanceStatus): string {
    if (status === 'PRESENT' || status === 'INCOMPLETE') return 'b-present';
    if (status === 'LATE') return 'b-late';
    if (status === 'JUSTIFIED') return 'b-justified';
    return 'b-absent';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PRESENT: 'Presente',
      LATE: 'Tardanza',
      ABSENT: 'Ausente',
      INCOMPLETE: 'Incompleto',
      JUSTIFIED: 'Justificado',
    };
    return map[status] ?? status;
  }

  openManualAdjustment(): void {
    if (!this.canManualAdjust() || this.recordsWithId().length === 0) return;

    this.manualErrorMessage.set(null);
    this.manualSuccessMessage.set(null);
    this.manualFormCheckIn.set('');
    this.manualFormCheckOut.set('');
    this.manualFormReason.set('');

    const firstRecordId = this.recordsWithId()[0]?.id ?? '';
    this.manualFormRecordId.set(firstRecordId ?? '');
    this.isManualModalOpen.set(true);
  }

  closeManualAdjustment(): void {
    this.isManualModalOpen.set(false);
  }

  submitManualAdjustment(): void {
    const attendanceId = this.manualFormRecordId();
    const reason = this.manualFormReason().trim();
    const checkInAtRaw = this.manualFormCheckIn().trim();
    const checkOutAtRaw = this.manualFormCheckOut().trim();

    if (!attendanceId) {
      this.manualErrorMessage.set('Selecciona un registro de asistencia.');
      return;
    }

    if (!reason) {
      this.manualErrorMessage.set('Ingresa un motivo para el ajuste manual.');
      return;
    }

    if (!checkInAtRaw && !checkOutAtRaw) {
      this.manualErrorMessage.set(
        'Completa al menos hora de entrada o salida para ajustar.',
      );
      return;
    }

    this.isApplyingManualAdjustment.set(true);
    this.manualErrorMessage.set(null);

    const payload: ManualAdjustmentPayload = { reason };
    if (checkInAtRaw) payload.checkInAt = new Date(checkInAtRaw).toISOString();
    if (checkOutAtRaw) payload.checkOutAt = new Date(checkOutAtRaw).toISOString();

    this.attendanceApi
      .manualAdjustment(attendanceId, payload)
      .pipe(finalize(() => this.isApplyingManualAdjustment.set(false)))
      .subscribe({
        next: () => {
          this.manualSuccessMessage.set('Ajuste manual guardado correctamente.');
          this.isManualModalOpen.set(false);
          this.loadAttendance();
        },
        error: (error: HttpErrorResponse) => {
          const backendMessage = error.error?.message;

          if (Array.isArray(backendMessage) && backendMessage.length > 0) {
            this.manualErrorMessage.set(backendMessage.join(' · '));
            return;
          }

          if (typeof backendMessage === 'string' && backendMessage.trim()) {
            this.manualErrorMessage.set(backendMessage);
            return;
          }

          this.manualErrorMessage.set(
            'No se pudo guardar el ajuste manual. Intenta nuevamente.',
          );
        },
      });
  }

  private loadAttendance(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.manualSuccessMessage.set(null);

    const selectedDate = this.selectedDate();
    const statusFilter = this.selectedStatus() === 'ALL' ? undefined : this.selectedStatus();
    const privileged = this.isPrivilegedViewer();

    const attendanceRequest = privileged
      ? this.attendanceApi.getAttendance({
          from: selectedDate,
          to: selectedDate,
          status: statusFilter,
        })
      : this.attendanceApi.getMyAttendance();

    forkJoin({
      attendance: attendanceRequest,
      employees: privileged
        ? this.attendanceApi.getEmployees().pipe(catchError(() => of([])))
        : of([]),
      approvedIncidents: privileged
        ? this.attendanceApi
            .getApprovedIncidentsByDate(selectedDate)
            .pipe(catchError(() => of([])))
        : of([]),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ attendance, employees, approvedIncidents }) => {
          const mappedRows = privileged
            ? this.buildPrivilegedRows(attendance, employees, approvedIncidents, selectedDate)
            : this.buildEmployeeRows(attendance, selectedDate);

          this.allRows.set(mappedRows);
        },
        error: (error: HttpErrorResponse) => {
          const backendMessage = error.error?.message;

          if (Array.isArray(backendMessage) && backendMessage.length > 0) {
            this.errorMessage.set(backendMessage.join(' · '));
            return;
          }

          if (typeof backendMessage === 'string' && backendMessage.trim()) {
            this.errorMessage.set(backendMessage);
            return;
          }

          this.errorMessage.set(
            'No se pudieron cargar los registros de asistencia desde el backend.',
          );
        },
      });
  }

  private buildPrivilegedRows(
    attendanceRows: AttendanceRecordResponse[],
    employees: AttendanceEmployee[],
    approvedIncidents: IncidentResponse[],
    selectedDate: string,
  ): AttendanceRow[] {
    const activeEmployees = employees.filter(
      (item) => item.status.toUpperCase() === 'ACTIVE',
    );

    const attendanceByEmployee = new Map<string, AttendanceRecordResponse>();
    for (const row of attendanceRows) {
      if (!row.employee?.id) continue;
      const current = attendanceByEmployee.get(row.employee.id);
      if (!current) {
        attendanceByEmployee.set(row.employee.id, row);
        continue;
      }
      const currentTime = this.getRecordSortTime(current).getTime();
      const candidateTime = this.getRecordSortTime(row).getTime();
      if (candidateTime > currentTime) {
        attendanceByEmployee.set(row.employee.id, row);
      }
    }

    const justifiedEmployeeIds = new Set(
      approvedIncidents
        .filter((item) => item.attendance_date === selectedDate)
        .map((item) => item.employee.id),
    );

    const rows: AttendanceRow[] = activeEmployees.map((employee) => {
      const attendanceRecord = attendanceByEmployee.get(employee.id);
      if (attendanceRecord) {
        return this.mapAttendanceRecordToRow(attendanceRecord);
      }

      if (justifiedEmployeeIds.has(employee.id)) {
        return this.mapJustifiedRow(employee, selectedDate);
      }

      return this.mapAbsentRow(employee, selectedDate);
    });

    for (const record of attendanceRows) {
      if (rows.some((item) => item.employeeId === record.employee.id)) continue;
      rows.push(this.mapAttendanceRecordToRow(record));
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  private buildEmployeeRows(
    attendanceRows: AttendanceRecordResponse[],
    selectedDate: string,
  ): AttendanceRow[] {
    const filtered = attendanceRows.filter((item) => item.attendance_date === selectedDate);
    return filtered
      .map((item) => this.mapAttendanceRecordToRow(item))
      .sort((a, b) => this.compareDateDesc(a.date, b.date));
  }

  private mapAttendanceRecordToRow(row: AttendanceRecordResponse): AttendanceRow {
    const normalizedStatus = this.normalizeStatus(row.status);
    const firstName = row.employee.first_name ?? '';
    const lastName = row.employee.last_name ?? '';
    const sourceRaw = row.source?.toUpperCase() ?? null;
    const source = sourceRaw === 'QR' || sourceRaw === 'MANUAL' ? sourceRaw : null;

    return {
      id: row.id,
      employeeId: row.employee.id,
      employeeCode: row.employee.code,
      initials: this.buildInitials(firstName, lastName),
      name: `${firstName} ${lastName}`.trim(),
      date: this.formatDate(row.attendance_date),
      checkInAt: row.check_in_at ? this.formatTime(row.check_in_at) : '—',
      checkOutAt: row.check_out_at ? this.formatTime(row.check_out_at) : '—',
      workedHours: this.calculateWorkedHours(row.check_in_at, row.check_out_at),
      status: normalizedStatus,
      lateMinutes: row.late_minutes > 0 ? String(row.late_minutes) : row.late_minutes === 0 ? '0' : '—',
      source,
      qrSession: row.qr_session?.id ?? null,
    };
  }

  private mapAbsentRow(employee: AttendanceEmployee, attendanceDate: string): AttendanceRow {
    return {
      id: null,
      employeeId: employee.id,
      employeeCode: employee.code,
      initials: this.buildInitials(employee.first_name, employee.last_name),
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      date: this.formatDate(attendanceDate),
      checkInAt: '—',
      checkOutAt: '—',
      workedHours: '—',
      status: 'ABSENT',
      lateMinutes: '—',
      source: null,
      qrSession: null,
    };
  }

  private mapJustifiedRow(employee: AttendanceEmployee, attendanceDate: string): AttendanceRow {
    return {
      id: null,
      employeeId: employee.id,
      employeeCode: employee.code,
      initials: this.buildInitials(employee.first_name, employee.last_name),
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      date: this.formatDate(attendanceDate),
      checkInAt: '—',
      checkOutAt: '—',
      workedHours: '—',
      status: 'JUSTIFIED',
      lateMinutes: '—',
      source: 'MANUAL',
      qrSession: null,
    };
  }

  private getRecordSortTime(record: AttendanceRecordResponse): Date {
    if (record.check_out_at) return new Date(record.check_out_at);
    if (record.check_in_at) return new Date(record.check_in_at);
    return new Date(record.attendance_date);
  }

  private normalizeStatus(status: string): AttendanceStatus {
    if (
      status === 'PRESENT' ||
      status === 'LATE' ||
      status === 'ABSENT' ||
      status === 'INCOMPLETE' ||
      status === 'JUSTIFIED'
    ) {
      return status;
    }
    return 'ABSENT';
  }

  private calculateWorkedHours(
    checkInAt?: string | null,
    checkOutAt?: string | null,
  ): string {
    if (!checkInAt || !checkOutAt) return '—';

    const checkIn = new Date(checkInAt);
    const checkOut = new Date(checkOutAt);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    if (diffMs <= 0) return '—';

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  private buildInitials(firstName: string, lastName: string): string {
    const first = firstName.trim().charAt(0).toUpperCase();
    const last = lastName.trim().charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatTime(value: string): string {
    const date = new Date(value);
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private compareDateDesc(aDate: string, bDate: string): number {
    const [aDay, aMonth, aYear] = aDate.split('/').map(Number);
    const [bDay, bMonth, bYear] = bDate.split('/').map(Number);
    const aValue = new Date(aYear, aMonth - 1, aDay).getTime();
    const bValue = new Date(bYear, bMonth - 1, bDay).getTime();
    return bValue - aValue;
  }

  private getRoles(): string[] {
    const session = this.authSession.session();
    if (!session) return [];

    const fromRoles = session.user.roles ?? [];
    const fromRole = session.user.role ? [session.user.role] : [];
    return Array.from(new Set([...fromRoles, ...fromRole].map((item) => item.toUpperCase())));
  }
}
