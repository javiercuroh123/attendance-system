import { ChangeDetectionStrategy, Component } from '@angular/core';

interface OperationalRule {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

interface StackItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  operationalRules: OperationalRule[] = [
    {
      id: 'auto-qr',
      title: 'Registro automático por QR',
      description: 'Marca asistencia al escanear sin confirmación adicional',
      enabled: true,
    },
    {
      id: 'geo-validation',
      title: 'Validación de geolocalización',
      description:
        'Compara ubicación del dispositivo con worksite_latitude/longitude',
      enabled: false,
    },
    {
      id: 'audit-log',
      title: 'Registro en audit_logs',
      description: 'Guarda toda modificación manual en la tabla audit_logs',
      enabled: true,
    },
    {
      id: 'daily-report',
      title: 'Reporte diario automático',
      description: 'Ejecuta GET /reports/daily al cierre del día',
      enabled: true,
    },
  ];

  readonly stackItems: StackItem[] = [
    { label: 'Frontend web', value: 'Angular' },
    { label: 'App móvil', value: 'Ionic + Angular' },
    { label: 'Backend', value: 'NestJS' },
    { label: 'Base de datos', value: 'PostgreSQL · 8 tablas' },
  ];

  toggleRule(ruleId: string): void {
    this.operationalRules = this.operationalRules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
    );
  }
}
