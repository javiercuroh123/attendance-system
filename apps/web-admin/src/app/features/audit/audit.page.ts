import { ChangeDetectionStrategy, Component } from '@angular/core';

type AuditModule =
  | 'attendance'
  | 'incidents'
  | 'qr'
  | 'employees'
  | 'auth'
  | 'settings';

interface AuditEntry {
  module: AuditModule;
  summaryHtml: string;
  details: string;
  time: string;
}

@Component({
  selector: 'app-audit-page',
  standalone: true,
  templateUrl: './audit.page.html',
  styleUrl: './audit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  readonly auditEntries: AuditEntry[] = [
    {
      module: 'attendance',
      summaryHtml:
        '<b>Javier Alvarado</b> realizó ajuste manual en registro de <b>Carlos Ramos</b> (04/05/2025)',
      details: 'old: check_in_at=NULL · new: check_in_at=08:05:00',
      time: '05/05 · 09:14',
    },
    {
      module: 'incidents',
      summaryHtml:
        '<b>Javier Alvarado</b> aprobó solicitud de regularización de <b>Ana Torres</b>',
      details: 'status: PENDING → APPROVED · resolution_note añadida',
      time: '04/05 · 17:22',
    },
    {
      module: 'qr',
      summaryHtml: '<b>Javier Alvarado</b> generó sesión QR <b>QRS-0042</b>',
      details: 'starts_at: 08:10 · expires_at: 08:20 · point: Entrada principal',
      time: '05/05 · 08:10',
    },
    {
      module: 'employees',
      summaryHtml:
        '<b>Javier Alvarado</b> modificó estado de empleado <b>Jorge Mendoza</b>',
      details: 'old: status=ACTIVE · new: status=INACTIVE',
      time: '03/05 · 11:45',
    },
    {
      module: 'auth',
      summaryHtml: '<b>María Alvarado</b> inició sesión en el panel',
      details: 'IP: 192.168.1.24 · platform: Chrome / Windows',
      time: '05/05 · 08:00',
    },
    {
      module: 'settings',
      summaryHtml:
        '<b>Javier Alvarado</b> actualizó configuración general del sistema',
      details: 'tolerance_minutes: 10→15 · qr_point_description actualizado',
      time: '01/05 · 09:00',
    },
  ];
}
