import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  late: string;
  source: string;
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
  readonly summaryDate = this.formatSummaryDate(new Date());

  readonly statCards: StatCard[] = [
    { label: 'Empleados activos', value: '24', note: 'Estado', highlight: 'ACTIVE' },
    { label: 'Presentes', value: '19', note: 'PRESENT ·', highlight: '79 %' },
    { label: 'Tardanzas', value: '3', note: 'Estado', highlight: 'LATE' },
    { label: 'Ausentes', value: '2', note: 'Sin', highlight: 'justificar' },
    { label: 'QR activos', value: '1', note: 'Sesión', highlight: 'ACTIVE' },
  ];

  readonly weekBars: WeekBar[] = [
    { label: 'L', height: 88, fill: true },
    { label: 'M', height: 75, fill: true },
    { label: 'X', height: 92, fill: true },
    { label: 'J', height: 71, fill: true },
    { label: 'V', height: 79, today: true },
    { label: 'S', height: 20 },
    { label: 'D', height: 8 },
  ];

  readonly progressItems: ProgressItem[] = [
    { label: 'A tiempo', value: 79, tone: 'default' },
    { label: 'Tardanza', value: 13, tone: 'mid' },
    { label: 'Ausentes', value: 8, tone: 'low' },
  ];

  readonly activities: ActivityItem[] = [
    {
      type: 'ok',
      text: 'M. Alvarado registró entrada vía QR',
      timestamp: 'Hace 5 min · 08:02 AM',
    },
    {
      type: 'warn',
      text: 'C. Ramos marcado con tardanza (18 min)',
      timestamp: 'Hace 12 min · 08:18 AM',
    },
    {
      type: 'info',
      text: 'Nueva sesión QR generada por Admin',
      timestamp: 'Hace 20 min',
    },
    {
      type: 'err',
      text: 'J. Mendoza sin registro — falta acumulada',
      timestamp: '08:30 AM',
    },
    {
      type: 'info',
      text: 'Solicitud de regularización aprobada por RRHH',
      timestamp: 'Ayer · 05:14 PM',
    },
  ];

  readonly attendanceRecords: AttendanceRecord[] = [
    {
      initials: 'MA',
      employee: 'María Alvarado',
      codeArea: 'EMP-001 · RRHH',
      date: '05/05/2025',
      checkIn: '08:02',
      checkOut: '—',
      status: 'PRESENT',
      late: '—',
      source: 'QR',
    },
    {
      initials: 'CR',
      employee: 'Carlos Ramos',
      codeArea: 'EMP-002 · Desarrollo',
      date: '05/05/2025',
      checkIn: '08:18',
      checkOut: '—',
      status: 'LATE',
      late: '18 min',
      source: 'QR',
    },
    {
      initials: 'LP',
      employee: 'Lucía Paredes',
      codeArea: 'EMP-003 · Contabilidad',
      date: '05/05/2025',
      checkIn: '07:58',
      checkOut: '17:04',
      status: 'PRESENT',
      late: '—',
      source: 'QR',
    },
    {
      initials: 'JM',
      employee: 'Jorge Mendoza',
      codeArea: 'EMP-004 · Logística',
      date: '05/05/2025',
      checkIn: '—',
      checkOut: '—',
      status: 'ABSENT',
      late: '—',
      source: '—',
    },
  ];

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
