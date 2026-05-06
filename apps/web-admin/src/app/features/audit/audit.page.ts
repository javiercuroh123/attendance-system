import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuditApiService, AuditLogResponse } from './audit-api.service';

type AuditModule = 'attendance' | 'incidents' | 'qr' | 'employees' | 'auth' | 'settings';
type ModuleFilter = 'ALL' | AuditModule;

interface AuditEntryView {
  id: string;
  module: string;
  summary: string;
  details: string;
  time: string;
}

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit.page.html',
  styleUrl: './audit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  private readonly auditApi = inject(AuditApiService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly moduleFilter = signal<ModuleFilter>('ALL');
  readonly logsRaw = signal<AuditLogResponse[]>([]);

  readonly moduleOptions: Array<{ value: ModuleFilter; label: string }> = [
    { value: 'ALL', label: 'Todos los módulos' },
    { value: 'auth', label: 'auth' },
    { value: 'employees', label: 'employees' },
    { value: 'attendance', label: 'attendance' },
    { value: 'incidents', label: 'incidents' },
    { value: 'qr', label: 'qr' },
    { value: 'settings', label: 'settings' },
  ];

  readonly entries = computed<AuditEntryView[]>(() =>
    this.logsRaw().map((log) => this.mapToView(log)),
  );

  readonly entriesSummary = computed(() => {
    if (this.isLoading()) return 'Cargando registros...';
    return `Mostrando últimos ${this.entries().length} registros`;
  });

  constructor() {
    this.loadAuditLogs();
  }

  setModuleFilter(value: string): void {
    if (
      value === 'ALL' ||
      value === 'auth' ||
      value === 'employees' ||
      value === 'attendance' ||
      value === 'incidents' ||
      value === 'qr' ||
      value === 'settings'
    ) {
      this.moduleFilter.set(value);
      this.loadAuditLogs();
    }
  }

  refresh(): void {
    this.loadAuditLogs();
  }

  private loadAuditLogs(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const module = this.moduleFilter() === 'ALL' ? undefined : this.moduleFilter();

    this.auditApi
      .getAuditLogs({
        limit: 20,
        module,
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (rows) => this.logsRaw.set(rows),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private mapToView(log: AuditLogResponse): AuditEntryView {
    const actor = this.buildActorLabel(log);
    const action = this.humanizeAction(log.action);
    const entity = this.humanizeEntity(log.entity_name);
    const target = log.entity_id ? ` (${this.shortenId(log.entity_id)})` : '';

    const detailsParts: string[] = [];
    if (log.old_data) detailsParts.push(`old: ${this.summarizeValue(log.old_data)}`);
    if (log.new_data) detailsParts.push(`new: ${this.summarizeValue(log.new_data)}`);
    if (log.status) detailsParts.push(`status: ${log.status}`);
    if (log.ip_address) detailsParts.push(`ip: ${log.ip_address}`);
    if (log.device_info) detailsParts.push(`device: ${this.summarizeValue(log.device_info)}`);

    return {
      id: log.id,
      module: (log.module || 'unknown').toUpperCase(),
      summary: `${actor} realizó ${action} en ${entity}${target}`,
      details: detailsParts.join(' · ') || 'Sin detalles adicionales',
      time: this.formatDateTime(log.created_at),
    };
  }

  private buildActorLabel(log: AuditLogResponse): string {
    const email = log.actor_user?.email?.trim();
    if (email) {
      const [rawName] = email.split('@');
      const label = rawName.replace(/[._-]+/g, ' ').trim();
      return this.titleCase(label || email);
    }
    return `Usuario ${this.shortenId(log.actor_user_id)}`;
  }

  private humanizeAction(action: string): string {
    const upper = action?.trim().toUpperCase() ?? '';
    const dictionary: Record<string, string> = {
      CREATE: 'creación',
      UPDATE: 'actualización',
      DELETE: 'eliminación',
      APPROVE: 'aprobación',
      REJECT: 'rechazo',
      GENERATE: 'generación',
      VALIDATE: 'validación',
      LOGIN: 'inicio de sesión',
      LOGOUT: 'cierre de sesión',
      MANUAL_ADJUSTMENT: 'ajuste manual',
    };
    return dictionary[upper] ?? upper.toLowerCase().replace(/_/g, ' ');
  }

  private humanizeEntity(entityName: string): string {
    const normalized = entityName?.trim().toLowerCase() ?? '';
    const dictionary: Record<string, string> = {
      attendance_records: 'asistencia',
      incidents: 'incidencia',
      qr_sessions: 'sesión QR',
      employees: 'empleado',
      users: 'usuario',
      settings: 'configuración',
      auth: 'autenticación',
    };
    const value = dictionary[normalized] ?? normalized;
    return value || 'entidad';
  }

  private summarizeValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      const items = value.slice(0, 3).map((item) => this.summarizeValue(item));
      const suffix = value.length > 3 ? ', ...' : '';
      return `[${items.join(', ')}${suffix}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const compact = entries
      .slice(0, 4)
      .map(([key, item]) => `${key}=${this.summarizeValue(item)}`)
      .join(', ');
    return entries.length > 4 ? `${compact}, ...` : compact;
  }

  private shortenId(value: string): string {
    if (!value) return 'N/A';
    if (value.length <= 8) return value;
    return value.slice(0, 8);
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    const datePart = date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
    });
    const timePart = date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${datePart} · ${timePart}`;
  }

  private titleCase(value: string): string {
    return value
      .split(' ')
      .filter((segment) => segment.length > 0)
      .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
      .join(' ');
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' · ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No se pudo cargar la auditoría.';
  }
}
