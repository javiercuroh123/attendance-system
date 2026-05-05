import { ChangeDetectionStrategy, Component } from '@angular/core';

interface ScheduleRow {
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
  templateUrl: './schedules.page.html',
  styleUrl: './schedules.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesPage {
  readonly rows: ScheduleRow[] = [
    {
      code: 'SCH-01',
      name: 'Turno Mañana',
      start: '08:00',
      end: '17:00',
      tolerance: '10 min',
      days: 'Lun–Vie',
      status: 'ACTIVE',
    },
    {
      code: 'SCH-02',
      name: 'Turno Tarde',
      start: '14:00',
      end: '22:00',
      tolerance: '10 min',
      days: 'Lun–Vie',
      status: 'ACTIVE',
    },
    {
      code: 'SCH-03',
      name: 'Turno Noche',
      start: '22:00',
      end: '06:00',
      tolerance: '15 min',
      days: 'Lun–Dom',
      status: 'INACTIVE',
    },
  ];
}
