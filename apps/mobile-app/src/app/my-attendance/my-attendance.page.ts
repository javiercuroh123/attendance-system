import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  calendarClearOutline,
  chevronBackOutline,
  chevronForwardOutline,
  logInOutline,
  logOutOutline,
  syncOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import {
  AttendanceApiService,
  AttendanceRecordResponse,
  AttendanceStatus,
} from '../core/api/attendance-api.service';
import { AuthSessionService } from '../core/auth/auth-session.service';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

type AttendanceFilter = 'all' | 'PRESENT' | 'LATE' | 'ABSENT' | 'INCOMPLETE';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  source: string | null;
}

interface CalendarDay {
  day: number | null;
  status: AttendanceStatus | null;
  isToday: boolean;
  isWeekend: boolean;
}

interface AttendanceListItem extends AttendanceRecord {
  day: number;
  monthShort: string;
}

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.page.html',
  styleUrls: ['./my-attendance.page.scss'],
  imports: [IonContent, IonIcon, NgIf, NgFor, NgClass, PageHeaderComponent],
})
export class MyAttendancePage implements OnInit {
  protected readonly weekdays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  protected attendanceRecords: AttendanceRecord[] = [];
  protected filteredRecords: AttendanceListItem[] = [];
  protected activeFilter: AttendanceFilter = 'all';
  protected displayedMonth: number;
  protected displayedYear: number;
  protected calendarDays: CalendarDay[] = [];
  protected isLoading = false;
  protected errorMessage: string | null = null;

  private readonly timeFormatter = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  private readonly monthNamesLong = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  private readonly monthNamesShort = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ];

  constructor(
    private readonly attendanceApi: AttendanceApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {
    addIcons({
      syncOutline,
      chevronBackOutline,
      chevronForwardOutline,
      logInOutline,
      logOutOutline,
      alertCircleOutline,
      calendarClearOutline,
    });

    const now = new Date();
    this.displayedMonth = now.getMonth();
    this.displayedYear = now.getFullYear();
    this.buildCalendar();
  }

  async ngOnInit(): Promise<void> {
    await this.refreshAttendanceData();
  }

  protected get monthLabel(): string {
    return `${this.monthNamesLong[this.displayedMonth]} ${this.displayedYear}`;
  }

  protected changeMonth(delta: number): void {
    this.displayedMonth += delta;

    if (this.displayedMonth > 11) {
      this.displayedMonth = 0;
      this.displayedYear += 1;
    }

    if (this.displayedMonth < 0) {
      this.displayedMonth = 11;
      this.displayedYear -= 1;
    }

    this.buildCalendar();
  }

  protected setFilter(filter: AttendanceFilter): void {
    if (this.activeFilter === filter) {
      return;
    }

    this.activeFilter = filter;
    this.rebuildFilteredRecords();
  }

  protected async refreshAttendanceData(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(this.attendanceApi.getMyAttendance());
      this.attendanceRecords = response.map((record) => this.mapAttendanceRecord(record));
      this.rebuildFilteredRecords();
      this.buildCalendar();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.session.clearSession();
        await this.router.navigateByUrl('/login');
        return;
      }

      this.attendanceRecords = [];
      this.rebuildFilteredRecords();
      this.buildCalendar();
      this.errorMessage = this.resolveErrorMessage(error);
    } finally {
      this.isLoading = false;
    }
  }

  protected statusLabel(status: AttendanceStatus): string {
    if (status === 'PRESENT') {
      return 'Puntual';
    }

    if (status === 'LATE') {
      return 'Tardanza';
    }

    if (status === 'ABSENT') {
      return 'Falta';
    }

    if (status === 'INCOMPLETE') {
      return 'Incompleto';
    }

    return 'Justificado';
  }

  protected statusClass(status: AttendanceStatus): string {
    if (status === 'PRESENT') {
      return 'present';
    }

    if (status === 'LATE') {
      return 'late';
    }

    if (status === 'ABSENT') {
      return 'absent';
    }

    if (status === 'INCOMPLETE') {
      return 'incomplete';
    }

    return 'justified';
  }

  protected trackByWeekday(index: number, weekday: string): string {
    return `${index}-${weekday}`;
  }

  protected trackByCalendarDay(index: number, day: CalendarDay): string {
    return `${index}-${day.day ?? 'empty'}`;
  }

  protected trackByRecordId(_: number, record: AttendanceListItem): string {
    return record.id;
  }

  private buildCalendar(): void {
    const firstDay = new Date(this.displayedYear, this.displayedMonth, 1).getDay();
    const daysInMonth = new Date(
      this.displayedYear,
      this.displayedMonth + 1,
      0,
    ).getDate();

    const today = new Date();
    const recordsByDate = new Map(
      this.attendanceRecords.map((record) => [record.date, record.status]),
    );

    const days: CalendarDay[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, status: null, isToday: false, isWeekend: false });
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const dateKey = `${this.displayedYear}-${String(this.displayedMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      const dayOfWeek = new Date(
        this.displayedYear,
        this.displayedMonth,
        dayNumber,
      ).getDay();

      days.push({
        day: dayNumber,
        status: recordsByDate.get(dateKey) ?? null,
        isToday:
          dayNumber === today.getDate() &&
          this.displayedMonth === today.getMonth() &&
          this.displayedYear === today.getFullYear(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    while (days.length < 42) {
      days.push({ day: null, status: null, isToday: false, isWeekend: false });
    }

    this.calendarDays = days;
  }

  private matchesFilter(status: AttendanceStatus): boolean {
    if (this.activeFilter === 'PRESENT') {
      return status === 'PRESENT' || status === 'JUSTIFIED';
    }

    return status === this.activeFilter;
  }

  private rebuildFilteredRecords(): void {
    const sorted = [...this.attendanceRecords].sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    const filtered =
      this.activeFilter === 'all'
        ? sorted
        : sorted.filter((record) => this.matchesFilter(record.status));

    this.filteredRecords = filtered.map((record) => {
      const date = new Date(`${record.date}T12:00:00`);
      return {
        ...record,
        day: date.getDate(),
        monthShort: this.monthNamesShort[date.getMonth()],
      };
    });
  }

  private mapAttendanceRecord(record: AttendanceRecordResponse): AttendanceRecord {
    return {
      id: record.id,
      date: record.attendance_date,
      checkIn: this.formatTime(record.check_in_at),
      checkOut: this.formatTime(record.check_out_at),
      status: this.normalizeStatus(record.status),
      lateMinutes: record.late_minutes,
      source: record.source ?? null,
    };
  }

  private normalizeStatus(status: AttendanceStatus): AttendanceStatus {
    if (
      status === 'PRESENT' ||
      status === 'LATE' ||
      status === 'ABSENT' ||
      status === 'INCOMPLETE' ||
      status === 'JUSTIFIED'
    ) {
      return status;
    }

    return 'PRESENT';
  }

  private formatTime(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return this.timeFormatter.format(parsed);
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

    return 'No se pudo cargar tu historial de asistencia.';
  }
}
