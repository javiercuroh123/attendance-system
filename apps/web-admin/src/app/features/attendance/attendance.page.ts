import { ChangeDetectionStrategy, Component } from '@angular/core';

interface AttendanceRow {
  initials: string;
  name: string;
  date: string;
  checkInAt: string;
  checkOutAt: string;
  workedHours: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'JUSTIFIED';
  lateMinutes: string;
  source: 'QR' | 'MANUAL' | null;
  qrSession: string | null;
}

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  templateUrl: './attendance.page.html',
  styleUrl: './attendance.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePage {
  readonly rows: AttendanceRow[] = [
    {
      initials: 'MA',
      name: 'María Alvarado',
      date: '05/05/2025',
      checkInAt: '08:02:14',
      checkOutAt: '—',
      workedHours: '—',
      status: 'PRESENT',
      lateMinutes: '0',
      source: 'QR',
      qrSession: 'QRS-0041',
    },
    {
      initials: 'CR',
      name: 'Carlos Ramos',
      date: '05/05/2025',
      checkInAt: '08:18:07',
      checkOutAt: '—',
      workedHours: '—',
      status: 'LATE',
      lateMinutes: '18',
      source: 'QR',
      qrSession: 'QRS-0041',
    },
    {
      initials: 'LP',
      name: 'Lucía Paredes',
      date: '05/05/2025',
      checkInAt: '07:58:33',
      checkOutAt: '17:04:11',
      workedHours: '9h 05m',
      status: 'PRESENT',
      lateMinutes: '0',
      source: 'QR',
      qrSession: 'QRS-0041',
    },
    {
      initials: 'JM',
      name: 'Jorge Mendoza',
      date: '05/05/2025',
      checkInAt: '—',
      checkOutAt: '—',
      workedHours: '—',
      status: 'ABSENT',
      lateMinutes: '—',
      source: null,
      qrSession: null,
    },
    {
      initials: 'AT',
      name: 'Ana Torres',
      date: '05/05/2025',
      checkInAt: '—',
      checkOutAt: '—',
      workedHours: '—',
      status: 'JUSTIFIED',
      lateMinutes: '—',
      source: 'MANUAL',
      qrSession: null,
    },
  ];
}
