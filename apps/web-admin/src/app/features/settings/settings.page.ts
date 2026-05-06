import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  SettingsApiService,
  SystemSettingsResponse,
  UpdateSystemSettingsPayload,
} from './settings-api.service';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly settingsApi = inject(SettingsApiService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly companyName = signal('');
  readonly worksiteName = signal('');
  readonly worksiteAddress = signal('');
  readonly worksiteLatitude = signal('');
  readonly worksiteLongitude = signal('');
  readonly qrPointDescription = signal('');
  readonly defaultTimezone = signal('America/Lima');
  readonly status = signal('ACTIVE');

  readonly timezoneOptions = [
    'America/Lima',
    'America/Bogota',
    'America/Mexico_City',
    'UTC',
  ];

  readonly statusOptions = ['ACTIVE', 'INACTIVE'];

  readonly operationalRules = computed<OperationalRule[]>(() => [
    {
      id: 'auto-qr',
      title: 'Registro automático por QR',
      description: 'Activo cuando el sistema está en estado ACTIVE',
      enabled: this.status() === 'ACTIVE',
    },
    {
      id: 'geo-validation',
      title: 'Validación de geolocalización',
      description:
        'Activo cuando hay worksite_latitude y worksite_longitude definidos',
      enabled: this.worksiteLatitude().trim() !== '' && this.worksiteLongitude().trim() !== '',
    },
    {
      id: 'audit-log',
      title: 'Registro en audit_logs',
      description: 'Se registra automáticamente en backend al editar configuración',
      enabled: true,
    },
    {
      id: 'daily-report',
      title: 'Reporte diario automático',
      description: 'Disponible en endpoint GET /reports/daily',
      enabled: true,
    },
  ]);

  readonly stackItems: StackItem[] = [
    { label: 'Frontend web', value: 'Angular' },
    { label: 'App móvil', value: 'Ionic + Angular' },
    { label: 'Backend', value: 'NestJS' },
    { label: 'Base de datos', value: 'PostgreSQL · 8 tablas' },
  ];

  constructor() {
    this.loadSettings();
  }

  saveChanges(): void {
    if (this.isSaving()) return;

    const payload = this.buildPayload();
    if (!payload) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.settingsApi
      .updateSettings(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.applySettingsToForm(updated);
          this.successMessage.set('Configuración guardada correctamente.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private loadSettings(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.settingsApi
      .getSettings()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (settings) => this.applySettingsToForm(settings),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private applySettingsToForm(settings: SystemSettingsResponse): void {
    this.companyName.set(settings.company_name ?? '');
    this.worksiteName.set(settings.worksite_name ?? '');
    this.worksiteAddress.set(settings.worksite_address ?? '');
    this.worksiteLatitude.set(
      settings.worksite_latitude !== null && settings.worksite_latitude !== undefined
        ? String(settings.worksite_latitude)
        : '',
    );
    this.worksiteLongitude.set(
      settings.worksite_longitude !== null && settings.worksite_longitude !== undefined
        ? String(settings.worksite_longitude)
        : '',
    );
    this.qrPointDescription.set(settings.qr_point_description ?? '');
    this.defaultTimezone.set(settings.default_timezone ?? 'America/Lima');
    this.status.set(settings.status ?? 'ACTIVE');
  }

  private buildPayload(): UpdateSystemSettingsPayload | null {
    const companyName = this.companyName().trim();
    const worksiteName = this.worksiteName().trim();
    const defaultTimezone = this.defaultTimezone().trim();
    const status = this.status().trim();

    if (!companyName) {
      this.errorMessage.set('El nombre de la empresa es obligatorio.');
      return null;
    }

    if (!worksiteName) {
      this.errorMessage.set('El nombre del centro de trabajo es obligatorio.');
      return null;
    }

    const latitude = this.parseOptionalNumber(this.worksiteLatitude().trim(), 'latitud');
    if (latitude === undefined) return null;

    const longitude = this.parseOptionalNumber(this.worksiteLongitude().trim(), 'longitud');
    if (longitude === undefined) return null;

    this.errorMessage.set(null);

    return {
      companyName,
      worksiteName,
      worksiteAddress: this.normalizeOptionalText(this.worksiteAddress()),
      worksiteLatitude: latitude,
      worksiteLongitude: longitude,
      qrPointDescription: this.normalizeOptionalText(this.qrPointDescription()),
      defaultTimezone: defaultTimezone || 'America/Lima',
      status: status || 'ACTIVE',
    };
  }

  private parseOptionalNumber(
    value: string,
    field: 'latitud' | 'longitud',
  ): number | null | undefined {
    if (!value) return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      this.errorMessage.set(`La ${field} debe ser un número válido.`);
      return undefined;
    }
    return parsed;
  }

  private normalizeOptionalText(value: string): string | null {
    const normalized = value.trim();
    return normalized.length ? normalized : null;
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' · ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No se pudo guardar la configuración.';
  }
}
