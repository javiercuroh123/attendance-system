import { ChangeDetectionStrategy, Component } from '@angular/core';

interface EmployeeRow {
  initials: string;
  name: string;
  code: string;
  dni: string;
  positionArea: string;
  schedule: string;
  role: 'RRHH' | 'EMPLOYEE' | 'SUPERVISOR';
  status: 'ACTIVE' | 'INACTIVE';
  attendancePct: number;
}

@Component({
  selector: 'app-employees-page',
  standalone: true,
  templateUrl: './employees.page.html',
  styleUrl: './employees.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesPage {
  readonly rows: EmployeeRow[] = [
    {
      initials: 'MA',
      name: 'María Alvarado',
      code: 'EMP-001',
      dni: '45120321',
      positionArea: 'Analista / Recursos Humanos',
      schedule: 'Mañana 08–17',
      role: 'RRHH',
      status: 'ACTIVE',
      attendancePct: 94,
    },
    {
      initials: 'CR',
      name: 'Carlos Ramos',
      code: 'EMP-002',
      dni: '46883712',
      positionArea: 'Dev Senior / Sistemas',
      schedule: 'Mañana 08–17',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      attendancePct: 78,
    },
    {
      initials: 'LP',
      name: 'Lucía Paredes',
      code: 'EMP-003',
      dni: '47221940',
      positionArea: 'Contadora / Finanzas',
      schedule: 'Mañana 08–17',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      attendancePct: 97,
    },
    {
      initials: 'JM',
      name: 'Jorge Mendoza',
      code: 'EMP-004',
      dni: '44019823',
      positionArea: 'Jefe / Logística',
      schedule: 'Tarde 14–22',
      role: 'SUPERVISOR',
      status: 'INACTIVE',
      attendancePct: 52,
    },
  ];
}
