import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AppRole, getUserRoles, hasAnyRole } from '../../core/auth/role-access';
import {
  DashboardApiService,
  DashboardAttendanceRecord,
  DashboardAudit,
  DashboardEmployee,
  DashboardIncident,
} from './dashboard-api.service';

interface StatCard {
  label: string;
  value: string;
  note: string;
  highlight: string;
}

interface WeekBar {
  label: string;
  height: number;
  today?: boolean;
  fill?: boolean;
}

interface ProgressItem {
  label: string;
  value: number;
  tone: 'default' | 'mid' | 'low';
}

interface ActivityItem {
  type: 'ok' | 'warn' | 'info' | 'err';
  text: string;
  timestamp: string;
}

interface AttendanceRecord {
  initials: string;
  employee: string;
  codeArea: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'INCOMPLETE' | 'JUSTIFIED';
  late: string;
  source: string;
}

interface ActivityCandidate {
  at: Date;
  type: 'ok' | 'warn' | 'info' | 'err';
  text: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authSession = inject(AuthSessionService);

  readonly summaryDate = this.formatSummaryDate(new Date());
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly userRoles = computed<AppRole[]>(() =>
    getUserRoles(this.authSession.session()?.user),
  );
  readonly canUsePrivilegedDashboard = computed(() =>
    hasAnyRole(this.userRoles(), ['ADMIN', 'RRHH', 'SUPERVISOR']),
  );
  readonly canExportReport = computed(() => this.canUsePrivilegedDashboard());

  readonly statCards = signal<StatCard[]>([
    { label: 'Empleados activos', value: '0', note: 'Estado', highlight: 'Activo' },
    { label: 'Presentes', value: '0', note: 'Presentes ·', highlight: '0 %' },
    { label: 'Tardanzas', value: '0', note: 'Estado', highlight: 'Tardanza' },
    { label: 'Ausentes', value: '0', note: 'Sin', highlight: 'justificar' },
    { label: 'QR activos', value: '0', note: 'Sesión', highlight: 'Activo' },
  ]);

  readonly weekBars = signal<WeekBar[]>(this.buildEmptyWeekBars());
  readonly weekResumeText = signal('0 · 0 · 0 · 0 · 0 · 0 · 0 presentes');
  readonly weekAverageText = signal('0.0');

  readonly progressItems = signal<ProgressItem[]>([
    { label: 'A tiempo', value: 0, tone: 'default' },
    { label: 'Tardanza', value: 0, tone: 'mid' },
    { label: 'Ausentes', value: 0, tone: 'low' },
  ]);

  readonly activities = signal<ActivityItem[]>([]);
  readonly attendanceRecords = signal<AttendanceRecord[]>([]);

  constructor() {
    this.loadDashboard();
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  exportTodayReport(): void {
    if (!this.canExportReport()) {
      this.errorMessage.set('Tu rol no tiene permisos para exportar reportes.');
      return;
    }

    const todayIso = this.toIsoDate(new Date());
    this.dashboardApi.exportDailyReport(todayIso).subscribe({
      next: (response) => {
        if (!isPlatformBrowser(this.platformId)) return;

        const blob = new Blob([response.content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename || `reporte-diario-${todayIso}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage.set(
          'No se pudo exportar el reporte diario. Intenta nuevamente.',
        );
      },
    });
  }

  statusClass(status: AttendanceRecord['status']): string {
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

  isCompactStatValue(value: string): boolean {
    const normalized = value.trim();
    if (!normalized || normalized === '—') return false;

    return /[a-zA-Z]/.test(normalized);
  }

  private loadDashboard(): void {
    if (this.isLoading()) return;

    if (this.canUsePrivilegedDashboard()) {
      this.loadPrivilegedDashboard();
      return;
    }
    this.loadEmployeeDashboard();
  }

  private loadPrivilegedDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const now = new Date();
    const todayIso = this.toIsoDate(now);
    const weekRange = this.getWeekRange(now);

    forkJoin({
      employees: this.dashboardApi.getEmployees(),
      todayAttendance: this.dashboardApi.getAttendance({
        from: todayIso,
        to: todayIso,
      }),
      weekAttendance: this.dashboardApi.getAttendance({
        from: weekRange.from,
        to: weekRange.to,
      }),
      incidents: this.dashboardApi.getIncidents().pipe(catchError(() => of([]))),
      activeQrSessions: this.dashboardApi
        .getActiveQrSessions()
        .pipe(catchError(() => of([]))),
      audit: this.dashboardApi.getAudit(30).pipe(catchError(() => of([]))),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({
          employees,
          todayAttendance,
          weekAttendance,
          incidents,
          activeQrSessions,
          audit,
        }) => {
          const activeEmployees = this.countActiveEmployees(employees);
          const onTimeCount = todayAttendance.filter((item) =>
            this.isOnTimeStatus(item.status),
          ).length;
          const lateCount = todayAttendance.filter((item) =>
            this.isLateStatus(item.status),
          ).length;
          const absentCount = this.calculateAbsentCount(
            todayAttendance,
            activeEmployees,
          );

          this.statCards.set([
            {
              label: 'Empleados activos',
              value: String(activeEmployees),
              note: 'Estado',
              highlight: 'Activo',
            },
            {
              label: 'Presentes',
              value: String(onTimeCount),
              note: 'Presentes ·',
              highlight: `${this.calculatePercentage(onTimeCount, activeEmployees)} %`,
            },
            {
              label: 'Tardanzas',
              value: String(lateCount),
              note: 'Estado',
              highlight: 'Tardanza',
            },
            {
              label: 'Ausentes',
              value: String(absentCount),
              note: 'Sin',
              highlight: 'justificar',
            },
            {
              label: 'QR activos',
              value: String(activeQrSessions.length),
              note: 'Sesión',
              highlight: 'Activo',
            },
          ]);

          this.progressItems.set([
            {
              label: 'A tiempo',
              value: this.calculatePercentage(onTimeCount, activeEmployees),
              tone: 'default',
            },
            {
              label: 'Tardanza',
              value: this.calculatePercentage(lateCount, activeEmployees),
              tone: 'mid',
            },
            {
              label: 'Ausentes',
              value: this.calculatePercentage(absentCount, activeEmployees),
              tone: 'low',
            },
          ]);

          this.updateWeekSummary(weekAttendance, now);
          this.attendanceRecords.set(this.mapAttendanceRows(todayAttendance));
          this.activities.set(
            this.buildRecentActivity(todayAttendance, incidents, audit),
          );
        },
        error: (error: HttpErrorResponse) => this.setDashboardLoadError(error),
      });
  }

  private loadEmployeeDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const now = new Date();
    const todayIso = this.toIsoDate(now);
    const weekRange = this.getWeekRange(now);

    forkJoin({
      myAttendance: this.dashboardApi.getMyAttendance(),
      myIncidents: this.dashboardApi.getMyIncidents().pipe(catchError(() => of([]))),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ myAttendance, myIncidents }) => {
          const todayRows = myAttendance.filter((item) => item.attendance_date === todayIso);
          const latestToday = [...todayRows].sort(
            (a, b) =>
              this.getAttendanceEventDate(b).getTime() -
              this.getAttendanceEventDate(a).getTime(),
          )[0];

          const monthAttendance = myAttendance.filter((item) =>
            this.isSameMonthIsoDate(item.attendance_date, now),
          );
          const monthLate = monthAttendance.filter((item) =>
            this.isLateStatus(item.status),
          ).length;

          const pendingIncidents = myIncidents.filter(
            (item) => item.status.toUpperCase() === 'PENDING',
          ).length;
          const approvedIncidentsMonth = myIncidents.filter(
            (item) =>
              item.status.toUpperCase() === 'APPROVED' &&
              this.isSameMonthDateTime(item.created_at, now),
          ).length;

          const checkInText = latestToday?.check_in_at
            ? this.formatTime(latestToday.check_in_at)
            : '—';
          const checkOutText = latestToday?.check_out_at
            ? this.formatTime(latestToday.check_out_at)
            : '—';
          const todayStatus = latestToday
            ? this.normalizeAttendanceStatus(latestToday.status)
            : 'ABSENT';

          this.statCards.set([
            {
              label: 'Estado de hoy',
              value: todayStatus === 'ABSENT' ? 'Sin marca' : this.statusLabel(todayStatus),
              note: 'Entrada',
              highlight: checkInText,
            },
            {
              label: 'Salida de hoy',
              value: checkOutText === '—' ? 'Pendiente' : checkOutText,
              note: 'Estado',
              highlight: checkOutText === '—' ? 'Incompleto' : 'OK',
            },
            {
              label: 'Registros (mes)',
              value: String(monthAttendance.length),
              note: 'Fuente',
              highlight: 'attendance/me',
            },
            {
              label: 'Tardanzas (mes)',
              value: String(monthLate),
              note: 'Estado',
              highlight: 'Tardanza',
            },
            {
              label: 'Incidencias pendientes',
              value: String(pendingIncidents),
              note: 'Aprobadas (mes)',
              highlight: String(approvedIncidentsMonth),
            },
          ]);

          const weekRows = myAttendance.filter(
            (item) =>
              item.attendance_date >= weekRange.from &&
              item.attendance_date <= weekRange.to,
          );

          const weekDays = this.getWeekDates(now);
          let onTimeDays = 0;
          let lateDays = 0;
          let missingDays = 0;

          for (const day of weekDays) {
            const iso = this.toIsoDate(day);
            const dayRows = weekRows.filter((item) => item.attendance_date === iso);
            const dayRecord = [...dayRows].sort(
              (a, b) =>
                this.getAttendanceEventDate(b).getTime() -
                this.getAttendanceEventDate(a).getTime(),
            )[0];

            if (!dayRecord) {
              missingDays += 1;
              continue;
            }

            if (this.isLateStatus(dayRecord.status)) {
              lateDays += 1;
              continue;
            }

            if (this.isAttendanceMarked(dayRecord)) {
              onTimeDays += 1;
            } else {
              missingDays += 1;
            }
          }

          this.progressItems.set([
            {
              label: 'A tiempo',
              value: this.calculatePercentage(onTimeDays, weekDays.length),
              tone: 'default',
            },
            {
              label: 'Tardanza',
              value: this.calculatePercentage(lateDays, weekDays.length),
              tone: 'mid',
            },
            {
              label: 'Sin marcación',
              value: this.calculatePercentage(missingDays, weekDays.length),
              tone: 'low',
            },
          ]);

          this.updateWeekSummaryForEmployee(weekRows, now);
          this.attendanceRecords.set(this.mapAttendanceRows(myAttendance));
          this.activities.set(this.buildRecentActivity(myAttendance, myIncidents, []));
        },
        error: (error: HttpErrorResponse) => this.setDashboardLoadError(error),
      });
  }

  private buildRecentActivity(
    attendanceRows: DashboardAttendanceRecord[],
    incidents: DashboardIncident[],
    auditRows: DashboardAudit[],
  ): ActivityItem[] {
    const candidates: ActivityCandidate[] = [];

    for (const row of attendanceRows) {
      const name = `${row.employee.first_name} ${row.employee.last_name}`;
      const eventDate = this.getAttendanceEventDate(row);

      if (this.isLateStatus(row.status)) {
        candidates.push({
          at: eventDate,
          type: 'warn',
          text: `${name} marcado con tardanza (${row.late_minutes} min)`,
        });
        continue;
      }

      if (row.status === 'ABSENT') {
        candidates.push({
          at: eventDate,
          type: 'err',
          text: `${name} sin registro de entrada`,
        });
        continue;
      }

      if (row.check_out_at) {
        candidates.push({
          at: eventDate,
          type: 'ok',
          text: `${name} registró salida`,
        });
      } else {
        const source = row.source ?? 'QR';
        candidates.push({
          at: eventDate,
          type: 'ok',
          text: `${name} registró entrada vía ${source}`,
        });
      }
    }

    for (const incident of incidents.slice(0, 5)) {
      const name = `${incident.employee.first_name} ${incident.employee.last_name}`;
      const status =
        incident.status === 'PENDING'
          ? 'pendiente'
          : incident.status === 'APPROVED'
            ? 'aprobada'
            : 'rechazada';
      const eventDate = incident.reviewed_at
        ? new Date(incident.reviewed_at)
        : new Date(incident.created_at);

      candidates.push({
        at: eventDate,
        type:
          incident.status === 'PENDING'
            ? 'info'
            : incident.status === 'APPROVED'
              ? 'ok'
              : 'err',
        text: `Regularización ${status} de ${name}`,
      });
    }

    for (const audit of auditRows) {
      if (audit.module !== 'qr' || audit.action !== 'CREATE_SESSION') continue;
      candidates.push({
        at: new Date(audit.created_at),
        type: 'info',
        text: 'Nueva sesión QR generada por Admin',
      });
    }

    return candidates
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 5)
      .map((item) => ({
        type: item.type,
        text: item.text,
        timestamp: this.formatActivityTimestamp(item.at),
      }));
  }

  private mapAttendanceRows(rows: DashboardAttendanceRecord[]): AttendanceRecord[] {
    return [...rows]
      .sort(
        (a, b) =>
          this.getAttendanceEventDate(b).getTime() -
          this.getAttendanceEventDate(a).getTime(),
      )
      .slice(0, 8)
      .map((row) => {
        const fullName = `${row.employee.first_name} ${row.employee.last_name}`;
        const area = row.employee.area_name ?? 'Sin área';
        const source = row.source ?? '—';
        return {
          initials: this.buildInitials(row.employee.first_name, row.employee.last_name),
          employee: fullName,
          codeArea: `${row.employee.code} · ${area}`,
          date: this.formatDate(row.attendance_date),
          checkIn: row.check_in_at ? this.formatTime(row.check_in_at) : '—',
          checkOut: row.check_out_at ? this.formatTime(row.check_out_at) : '—',
          status: this.normalizeAttendanceStatus(row.status),
          late: row.late_minutes > 0 ? `${row.late_minutes} min` : '—',
          source: source === '' ? '—' : source.toUpperCase(),
        };
      });
  }

  private updateWeekSummary(rows: DashboardAttendanceRecord[], today: Date): void {
    const weekDays = this.getWeekDates(today);
    const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const todayIso = this.toIsoDate(today);

    const mapByDay = new Map<string, Set<string>>();
    for (const day of weekDays) {
      mapByDay.set(this.toIsoDate(day), new Set<string>());
    }

    for (const row of rows) {
      if (!this.isAttendanceMarked(row)) continue;
      const key = row.attendance_date;
      const bucket = mapByDay.get(key);
      if (!bucket) continue;
      bucket.add(row.employee.id);
    }

    const counts = weekDays.map((date) => mapByDay.get(this.toIsoDate(date))?.size ?? 0);
    const maxCount = Math.max(1, ...counts);

    this.weekBars.set(
      weekDays.map((date, index) => {
        const iso = this.toIsoDate(date);
        const count = counts[index];
        const height = count === 0 ? 8 : Math.max(14, Math.round((count / maxCount) * 100));
        return {
          label: dayLabels[index],
          height,
          fill: count > 0,
          today: iso === todayIso,
        };
      }),
    );

    this.weekResumeText.set(`${counts.join(' · ')} presentes`);
    const average = counts.reduce((acc, current) => acc + current, 0) / counts.length;
    this.weekAverageText.set(average.toFixed(1));
  }

  private updateWeekSummaryForEmployee(
    rows: DashboardAttendanceRecord[],
    today: Date,
  ): void {
    const weekDays = this.getWeekDates(today);
    const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const todayIso = this.toIsoDate(today);

    const counts: number[] = weekDays.map((day) => {
      const dayIso = this.toIsoDate(day);
      const hasMarking = rows.some(
        (row) => row.attendance_date === dayIso && this.isAttendanceMarked(row),
      );
      return hasMarking ? 1 : 0;
    });

    this.weekBars.set(
      weekDays.map((date, index) => ({
        label: dayLabels[index],
        height: counts[index] > 0 ? 100 : 8,
        fill: counts[index] > 0,
        today: this.toIsoDate(date) === todayIso,
      })),
    );

    this.weekResumeText.set(`${counts.join(' · ')} marcaciones`);
    const total = counts.reduce((acc, current) => acc + current, 0);
    this.weekAverageText.set((total / counts.length).toFixed(1));
  }

  private getWeekRange(date: Date): { from: string; to: string } {
    const weekDays = this.getWeekDates(date);
    return {
      from: this.toIsoDate(weekDays[0]),
      to: this.toIsoDate(weekDays[6]),
    };
  }

  private getWeekDates(reference: Date): Date[] {
    const current = new Date(reference);
    const day = current.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(current);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(current.getDate() + diffToMonday);

    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date(monday);
      value.setDate(monday.getDate() + index);
      return value;
    });
  }

  private calculateAbsentCount(
    rows: DashboardAttendanceRecord[],
    activeEmployees: number,
  ): number {
    const markedEmployees = new Set<string>();
    let explicitAbsent = 0;

    for (const row of rows) {
      if (row.status === 'ABSENT') explicitAbsent += 1;
      if (this.isAttendanceMarked(row)) markedEmployees.add(row.employee.id);
    }

    const calculatedAbsent = Math.max(activeEmployees - markedEmployees.size, 0);
    return Math.max(calculatedAbsent, explicitAbsent);
  }

  private countActiveEmployees(employees: DashboardEmployee[]): number {
    return employees.filter((item) => item.status.toUpperCase() === 'ACTIVE').length;
  }

  private isAttendanceMarked(row: DashboardAttendanceRecord): boolean {
    if (row.check_in_at) return true;
    if (this.isOnTimeStatus(row.status)) return true;
    if (this.isLateStatus(row.status)) return true;
    return false;
  }

  private isOnTimeStatus(status: string): boolean {
    return status === 'PRESENT' || status === 'INCOMPLETE';
  }

  private isLateStatus(status: string): boolean {
    return status === 'LATE';
  }

  private normalizeAttendanceStatus(
    status: string,
  ): 'PRESENT' | 'LATE' | 'ABSENT' | 'INCOMPLETE' | 'JUSTIFIED' {
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

  private calculatePercentage(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  private getAttendanceEventDate(row: DashboardAttendanceRecord): Date {
    if (row.check_out_at) return new Date(row.check_out_at);
    if (row.check_in_at) return new Date(row.check_in_at);
    return new Date(row.updated_at);
  }

  private buildEmptyWeekBars(): WeekBar[] {
    return [
      { label: 'L', height: 8 },
      { label: 'M', height: 8 },
      { label: 'X', height: 8 },
      { label: 'J', height: 8 },
      { label: 'V', height: 8 },
      { label: 'S', height: 8 },
      { label: 'D', height: 8 },
    ];
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
      hour12: false,
    });
  }

  private formatActivityTimestamp(value: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - value.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const clock = value.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (diffMinutes < 1) return `Hace <1 min · ${clock}`;
    if (diffMinutes < 60) return `Hace ${diffMinutes} min · ${clock}`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h · ${clock}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = value.toDateString() === yesterday.toDateString();
    if (isYesterday) return `Ayer · ${clock}`;

    const dateText = value.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
    });
    return `${dateText} · ${clock}`;
  }

  private isSameMonthIsoDate(value: string, now: Date): boolean {
    const [yearRaw, monthRaw] = value.split('-').map(Number);
    if (!yearRaw || !monthRaw) return false;
    return yearRaw === now.getFullYear() && monthRaw === now.getMonth() + 1;
  }

  private isSameMonthDateTime(value: string, now: Date): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  private setDashboardLoadError(error: HttpErrorResponse): void {
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
      'No se pudieron cargar los datos del dashboard desde el backend.',
    );
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatSummaryDate(date: Date): string {
    const formatter = new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    return `${formatter.format(date)} — Turno activo`;
  }
}
