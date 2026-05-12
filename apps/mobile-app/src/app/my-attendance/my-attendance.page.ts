import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
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

type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'INCOMPLETE'
  | 'JUSTIFIED';

type AttendanceFilter = 'all' | 'PRESENT' | 'LATE' | 'ABSENT' | 'INCOMPLETE';

interface AttendanceRecord {
  id: number;
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
  imports: [
    IonContent,
    IonIcon,
    NgIf,
    NgFor,
    NgClass,
    PageHeaderComponent,
  ],
})
export class MyAttendancePage {
  protected readonly weekdays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  protected readonly attendanceRecords: AttendanceRecord[] = [
    {
      id: 1,
      date: '2026-05-01',
      checkIn: '07:55',
      checkOut: '17:02',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 2,
      date: '2026-05-02',
      checkIn: '08:12',
      checkOut: '17:05',
      status: 'LATE',
      lateMinutes: 2,
      source: 'QR',
    },
    {
      id: 3,
      date: '2026-05-04',
      checkIn: '07:58',
      checkOut: '17:00',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 4,
      date: '2026-05-05',
      checkIn: '08:00',
      checkOut: '17:10',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 5,
      date: '2026-05-06',
      checkIn: '08:25',
      checkOut: '17:03',
      status: 'LATE',
      lateMinutes: 15,
      source: 'QR',
    },
    {
      id: 6,
      date: '2026-05-07',
      checkIn: '07:50',
      checkOut: '17:00',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 7,
      date: '2026-05-08',
      checkIn: '08:05',
      checkOut: '17:08',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 8,
      date: '2026-05-09',
      checkIn: null,
      checkOut: null,
      status: 'ABSENT',
      lateMinutes: 0,
      source: null,
    },
    {
      id: 9,
      date: '2026-05-11',
      checkIn: '07:45',
      checkOut: '17:00',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 10,
      date: '2026-05-12',
      checkIn: '08:08',
      checkOut: null,
      status: 'INCOMPLETE',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 11,
      date: '2026-05-13',
      checkIn: '07:59',
      checkOut: '17:05',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 12,
      date: '2026-05-14',
      checkIn: '08:20',
      checkOut: '17:02',
      status: 'LATE',
      lateMinutes: 10,
      source: 'QR',
    },
    {
      id: 13,
      date: '2026-05-15',
      checkIn: '07:52',
      checkOut: '17:00',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 14,
      date: '2026-05-16',
      checkIn: '07:48',
      checkOut: '17:15',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 15,
      date: '2026-05-18',
      checkIn: '08:01',
      checkOut: '17:03',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 16,
      date: '2026-05-19',
      checkIn: '07:56',
      checkOut: '17:00',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 17,
      date: '2026-05-20',
      checkIn: '08:18',
      checkOut: '17:05',
      status: 'LATE',
      lateMinutes: 8,
      source: 'QR',
    },
    {
      id: 18,
      date: '2026-05-21',
      checkIn: '07:54',
      checkOut: '17:00',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 19,
      date: '2026-05-22',
      checkIn: '07:57',
      checkOut: '17:08',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
    {
      id: 20,
      date: '2026-05-23',
      checkIn: '07:49',
      checkOut: '17:02',
      status: 'PRESENT',
      lateMinutes: 0,
      source: 'QR',
    },
  ];

  protected activeFilter: AttendanceFilter = 'all';
  protected displayedMonth: number;
  protected displayedYear: number;
  protected calendarDays: CalendarDay[] = [];

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

  constructor() {
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

  protected get monthLabel(): string {
    return `${this.monthNamesLong[this.displayedMonth]} ${this.displayedYear}`;
  }

  protected get filteredRecords(): AttendanceListItem[] {
    const sorted = [...this.attendanceRecords].sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    const filtered =
      this.activeFilter === 'all'
        ? sorted
        : sorted.filter((record) => this.matchesFilter(record.status));

    return filtered.map((record) => {
      const date = new Date(`${record.date}T12:00:00`);
      return {
        ...record,
        day: date.getDate(),
        monthShort: this.monthNamesShort[date.getMonth()],
      };
    });
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
    this.activeFilter = filter;
  }

  protected refreshAttendanceData(): void {
    const now = new Date();
    this.displayedMonth = now.getMonth();
    this.displayedYear = now.getFullYear();
    this.buildCalendar();
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
}
