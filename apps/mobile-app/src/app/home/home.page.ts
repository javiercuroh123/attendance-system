import { NgClass, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarClearOutline,
  documentTextOutline,
  logInOutline,
  logOutOutline,
  notificationsOutline,
  personCircleOutline,
  qrCodeOutline,
  timeOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import {
  AttendanceApiService,
  AttendanceRecordResponse,
  AttendanceStatus,
} from '../core/api/attendance-api.service';
import { EmployeesApiService } from '../core/api/employees-api.service';
import { AuthSessionService } from '../core/auth/auth-session.service';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

type HomeStatus = 'none' | 'present' | 'late' | 'incomplete' | 'absent';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, NgClass, NgIf, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit, OnDestroy {
  protected employeeName = 'Empleado';
  protected employeeInitials = 'EM';

  protected checkInTime = '--:--';
  protected checkOutTime = '--:--';

  protected punctualCount = 0;
  protected lateCount = 0;
  protected absentCount = 0;

  protected statusLabel = 'Sin marcacion';
  protected statusClass: HomeStatus = 'none';

  protected greeting = 'Buenos dias';
  protected currentTime = '--:--:--';
  protected currentDate = '';
  protected monthLabel = '';
  protected errorMessage: string | null = null;
  protected isRefreshing = false;

  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private isViewActive = false;
  private hasLoadedOnce = false;
  private lastHomeDataRefreshAt = 0;
  private readonly homeDataRefreshIntervalMs = 45_000;

  private readonly timeFormatter = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  private readonly shortTimeFormatter = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  private readonly monthFormatter = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  });

  constructor(
    private readonly attendanceApi: AttendanceApiService,
    private readonly employeesApi: EmployeesApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {
    addIcons({
      notificationsOutline,
      logInOutline,
      logOutOutline,
      qrCodeOutline,
      calendarClearOutline,
      documentTextOutline,
      personCircleOutline,
      timeOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.refreshRealtimeData();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.stopClock();
  }

  async ionViewWillEnter(): Promise<void> {
    this.isViewActive = true;
    this.refreshRealtimeData();
    this.startClock();

    const now = Date.now();
    const shouldRefreshData =
      !this.hasLoadedOnce ||
      now - this.lastHomeDataRefreshAt >= this.homeDataRefreshIntervalMs;

    if (shouldRefreshData) {
      await this.loadHomeData();
      return;
    }

    this.cdr.markForCheck();
  }

  ionViewDidLeave(): void {
    this.isViewActive = false;
    this.stopClock();
  }

  protected async refreshHomeData(): Promise<void> {
    await this.loadHomeData();
  }

  private async loadHomeData(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    this.errorMessage = null;

    let profileError: unknown = null;
    let attendanceError: unknown = null;

    try {
      const profile = await firstValueFrom(this.employeesApi.getMyProfile());
      this.employeeName = `${profile.first_name} ${profile.last_name}`.trim();
      this.employeeInitials = this.buildInitials(profile.first_name, profile.last_name);
    } catch (error: unknown) {
      profileError = error;

      if (this.isUnauthorizedError(error)) {
        await this.forceLogin();
        return;
      }

      const fallbackName = this.resolveNameFromSession();
      this.employeeName = fallbackName;
      this.employeeInitials = this.buildInitials(fallbackName);
    }

    try {
      const records = await firstValueFrom(this.attendanceApi.getMyAttendance());
      this.applyAttendanceState(records);
    } catch (error: unknown) {
      attendanceError = error;

      if (this.isUnauthorizedError(error)) {
        await this.forceLogin();
        return;
      }

      this.resetAttendanceState();
      this.errorMessage = this.resolveErrorMessage(error);
    }

    if (profileError && attendanceError && !this.errorMessage) {
      this.errorMessage = this.resolveErrorMessage(attendanceError);
    }

    this.hasLoadedOnce = true;
    this.lastHomeDataRefreshAt = Date.now();
    this.isRefreshing = false;
    this.cdr.markForCheck();
  }

  private applyAttendanceState(records: AttendanceRecordResponse[]): void {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayKey = this.getDateKey(now);

    const todayRecord = records.find((record) => record.attendance_date === todayKey);

    this.checkInTime = this.formatTime(todayRecord?.check_in_at ?? null);
    this.checkOutTime = this.formatTime(todayRecord?.check_out_at ?? null);

    const monthRecords = records.filter((record) =>
      record.attendance_date.startsWith(monthKey),
    );

    this.punctualCount = monthRecords.filter((record) =>
      this.isPunctualStatus(record.status),
    ).length;
    this.lateCount = monthRecords.filter((record) => record.status === 'LATE').length;
    this.absentCount = monthRecords.filter((record) => record.status === 'ABSENT').length;

    if (!todayRecord) {
      this.statusClass = 'none';
      this.statusLabel = 'Sin marcacion';
      return;
    }

    this.statusClass = this.statusFromAttendance(todayRecord.status);
    this.statusLabel = this.statusLabelFromAttendance(todayRecord.status);
  }

  private resetAttendanceState(): void {
    this.checkInTime = '--:--';
    this.checkOutTime = '--:--';
    this.punctualCount = 0;
    this.lateCount = 0;
    this.absentCount = 0;
    this.statusClass = 'none';
    this.statusLabel = 'Sin marcacion';
  }

  private refreshRealtimeData(): void {
    const now = new Date();

    this.currentTime = this.timeFormatter.format(now);
    this.currentDate = this.capitalize(this.dateFormatter.format(now));
    this.monthLabel = this.capitalize(
      this.monthFormatter.format(now).replace(' de ', ' '),
    );
    this.greeting = this.resolveGreeting(now.getHours());
  }

  private resolveGreeting(hour: number): string {
    if (hour < 12) {
      return 'Buenos dias';
    }

    if (hour < 19) {
      return 'Buenas tardes';
    }

    return 'Buenas noches';
  }

  private capitalize(value: string): string {
    if (!value.length) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
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

  private resolveNameFromSession(): string {
    const sessionUser = this.session.session()?.user;
    if (!sessionUser) {
      return 'Empleado';
    }

    const base = sessionUser.email.split('@')[0]?.trim();
    if (!base) {
      return 'Empleado';
    }

    return base
      .split(/[._-]+/)
      .map((segment) => this.capitalize(segment))
      .join(' ');
  }

  private statusFromAttendance(status: AttendanceStatus): HomeStatus {
    if (status === 'LATE') {
      return 'late';
    }

    if (status === 'INCOMPLETE') {
      return 'incomplete';
    }

    if (status === 'ABSENT') {
      return 'absent';
    }

    if (status === 'PRESENT' || status === 'JUSTIFIED') {
      return 'present';
    }

    return 'none';
  }

  private statusLabelFromAttendance(status: AttendanceStatus): string {
    if (status === 'LATE') {
      return 'Tardanza';
    }

    if (status === 'INCOMPLETE') {
      return 'Incompleto';
    }

    if (status === 'ABSENT') {
      return 'Falta';
    }

    if (status === 'JUSTIFIED') {
      return 'Justificado';
    }

    if (status === 'PRESENT') {
      return 'Puntual';
    }

    return 'Sin marcacion';
  }

  private isPunctualStatus(status: AttendanceStatus): boolean {
    return status === 'PRESENT' || status === 'JUSTIFIED';
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatTime(value: string | null): string {
    if (!value) {
      return '--:--';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '--:--';
    }

    return this.shortTimeFormatter.format(parsed);
  }

  private isUnauthorizedError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
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

    return 'No se pudieron cargar tus datos de asistencia.';
  }

  private async forceLogin(): Promise<void> {
    this.session.clearSession();
    this.isRefreshing = false;
    await this.router.navigateByUrl('/login');
  }

  private startClock(): void {
    if (this.clockTimer !== null) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.clockTimer = setInterval(() => {
        if (!this.isViewActive) {
          return;
        }

        this.refreshRealtimeData();
        this.cdr.detectChanges();
      }, 1000);
    });
  }

  private stopClock(): void {
    if (this.clockTimer === null) {
      return;
    }

    clearInterval(this.clockTimer);
    this.clockTimer = null;
  }
}
