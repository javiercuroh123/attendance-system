import { ChangeDetectionStrategy, Component } from '@angular/core';

interface IncidentStat {
  label: string;
  value: string;
  note: string;
  highlight: string;
}

interface IncidentRequest {
  icon: string;
  employee: string;
  type: 'REGULARIZATION' | 'JUSTIFICATION' | 'PERMISSION';
  description: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  canReview: boolean;
}

@Component({
  selector: 'app-incidents-page',
  standalone: true,
  templateUrl: './incidents.page.html',
  styleUrl: './incidents.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentsPage {
  readonly stats: IncidentStat[] = [
    { label: 'Pendientes', value: '4', note: 'Estado', highlight: 'PENDING' },
    { label: 'Aprobadas (mes)', value: '11', note: 'Estado', highlight: 'APPROVED' },
    { label: 'Rechazadas (mes)', value: '2', note: 'Estado', highlight: 'REJECTED' },
    { label: 'Regularizaciones', value: '7', note: 'Tipo', highlight: 'REGULARIZATION' },
  ];

  readonly requests: IncidentRequest[] = [
    {
      icon: '📋',
      employee: 'Carlos Ramos',
      type: 'REGULARIZATION',
      description:
        'Olvido de marcación el 03/05/2025. Solicita registrar entrada 08:05 AM. Presenta justificación por corte de luz.',
      date: '03 May 2025',
      status: 'PENDING',
      canReview: true,
    },
    {
      icon: '📝',
      employee: 'Ana Torres',
      type: 'JUSTIFICATION',
      description:
        'Certificado médico presentado. Periodo: 02–04 mayo 2025. Adjunta documento escaneado.',
      date: '02–04 May 2025',
      status: 'APPROVED',
      canReview: false,
    },
    {
      icon: '🗓',
      employee: 'María Alvarado',
      type: 'PERMISSION',
      description:
        'Solicita permiso por trámite notarial el 07/05/2025 (medio día, mañana). Revisado por supervisor.',
      date: '07 May 2025',
      status: 'PENDING',
      canReview: true,
    },
    {
      icon: '✗',
      employee: 'Jorge Mendoza',
      type: 'REGULARIZATION',
      description:
        'Solicitud rechazada. No presentó respaldo de la ausencia del 28/04/2025. Nota: reincidencia.',
      date: '28 Abr 2025',
      status: 'REJECTED',
      canReview: false,
    },
  ];
}
