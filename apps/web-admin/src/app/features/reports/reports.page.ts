import { ChangeDetectionStrategy, Component } from '@angular/core';

interface RecentReport {
  title: string;
  meta: string;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {
  readonly recentReports: RecentReport[] = [
    {
      title: 'Asistencia general — Abril 2025',
      meta: 'Generado 01/05 · 24 empleados · monthly',
    },
    {
      title: 'Tardanzas — Q1 2025',
      meta: 'Generado 02/04 · late · todos los dpts.',
    },
    {
      title: 'Ausencias — Marzo 2025',
      meta: 'Generado 01/04 · absences · export',
    },
  ];
}
