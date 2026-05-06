import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { IncidentResponse, IncidentsApiService } from './incidents-api.service';

type IncidentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ResolveAction = 'APPROVE' | 'REJECT';

interface IncidentStat {
  label: string;
  value: string;
  note: string;
  highlight: string;
}

interface IncidentRequestView {
  id: string;
  icon: string;
  employee: string;
  type: string;
  description: string;
  date: string;
  status: IncidentStatus;
  canReview: boolean;
}

@Component({
  selector: 'app-incidents-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incidents.page.html',
  styleUrl: './incidents.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentsPage {
  private readonly incidentsApi = inject(IncidentsApiService);
  private readonly authSession = inject(AuthSessionService);

  readonly isLoading = signal(false);
  readonly isCreating = signal(false);
  readonly isResolving = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly createErrorMessage = signal<string | null>(null);
  readonly resolveErrorMessage = signal<string | null>(null);

  readonly statusFilter = signal<'ALL' | IncidentStatus>('ALL');
  readonly searchTerm = signal('');
  readonly attendanceDateFilter = signal('');

  readonly incidentsRaw = signal<IncidentResponse[]>([]);

  readonly isPrivilegedViewer = computed(() => {
    const roles = this.getRoles();
    return roles.includes('ADMIN') || roles.includes('RRHH') || roles.includes('SUPERVISOR');
  });

  readonly canReviewIncidents = computed(() => this.isPrivilegedViewer());

  readonly stats = computed<IncidentStat[]>(() => {
    const rows = this.incidentsRaw();
    const currentMonthRows = rows.filter((row) => this.isCurrentMonth(row.created_at));

    const pendingCount = rows.filter((row) => this.normalizeStatus(row.status) === 'PENDING').length;
    const approvedMonth = currentMonthRows.filter(
      (row) => this.normalizeStatus(row.status) === 'APPROVED',
    ).length;
    const rejectedMonth = currentMonthRows.filter(
      (row) => this.normalizeStatus(row.status) === 'REJECTED',
    ).length;
    const regularizations = rows.filter((row) =>
      this.isRegularizationType(row.request_type),
    ).length;

    return [
      { label: 'Pendientes', value: String(pendingCount), note: 'Estado', highlight: 'PENDING' },
      {
        label: 'Aprobadas (mes)',
        value: String(approvedMonth),
        note: 'Estado',
        highlight: 'APPROVED',
      },
      {
        label: 'Rechazadas (mes)',
        value: String(rejectedMonth),
        note: 'Estado',
        highlight: 'REJECTED',
      },
      {
        label: 'Regularizaciones',
        value: String(regularizations),
        note: 'Tipo',
        highlight: 'REGULARIZATION',
      },
    ];
  });

  readonly requests = computed<IncidentRequestView[]>(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    const dateFilter = this.attendanceDateFilter();
    const canReview = this.canReviewIncidents();

    return this.incidentsRaw()
      .filter((row) => {
        const normalized = this.normalizeStatus(row.status);
        if (statusFilter !== 'ALL' && normalized !== statusFilter) return false;
        if (dateFilter && row.attendance_date !== dateFilter) return false;

        if (!query) return true;
        const name = `${row.employee.first_name} ${row.employee.last_name}`.toLowerCase();
        const type = row.request_type.toLowerCase();
        const desc = row.description.toLowerCase();
        return (
          name.includes(query) ||
          type.includes(query) ||
          desc.includes(query) ||
          row.employee.code.toLowerCase().includes(query)
        );
      })
      .map((row) => {
        const normalized = this.normalizeStatus(row.status);
        const employeeName = `${row.employee.first_name} ${row.employee.last_name}`;
        return {
          id: row.id,
          icon: this.typeIcon(row.request_type),
          employee: employeeName,
          type: row.request_type.toUpperCase(),
          description: row.description,
          date: this.formatDate(row.attendance_date),
          status: normalized,
          canReview: canReview && normalized === 'PENDING',
        };
      });
  });

  readonly isCreateModalOpen = signal(false);
  readonly createAttendanceDate = signal(this.toIsoDate(new Date()));
  readonly createRequestType = signal('REGULARIZATION');
  readonly createDescription = signal('');

  readonly isResolveModalOpen = signal(false);
  readonly resolveAction = signal<ResolveAction>('APPROVE');
  readonly resolveIncidentId = signal('');
  readonly resolveIncidentLabel = signal('');
  readonly resolveNote = signal('');

  constructor() {
    this.loadIncidents();
  }

  refresh(): void {
    this.loadIncidents();
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setStatusFilter(value: string): void {
    if (value === 'ALL' || value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED') {
      this.statusFilter.set(value);
    }
  }

  setAttendanceDateFilter(value: string): void {
    this.attendanceDateFilter.set(value);
  }

  openCreateModal(): void {
    this.createErrorMessage.set(null);
    this.createAttendanceDate.set(this.toIsoDate(new Date()));
    this.createRequestType.set('REGULARIZATION');
    this.createDescription.set('');
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreate(): void {
    const attendanceDate = this.createAttendanceDate();
    const requestType = this.createRequestType().trim();
    const description = this.createDescription().trim();

    if (!attendanceDate) {
      this.createErrorMessage.set('Selecciona la fecha de asistencia.');
      return;
    }

    if (!requestType) {
      this.createErrorMessage.set('Selecciona un tipo de solicitud.');
      return;
    }

    if (!description) {
      this.createErrorMessage.set('Escribe una descripción para la incidencia.');
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    this.incidentsApi
      .createIncident({
        attendanceDate,
        requestType,
        description,
      })
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: () => {
          this.isCreateModalOpen.set(false);
          this.successMessage.set('Solicitud de incidencia registrada correctamente.');
          this.loadIncidents();
        },
        error: (error: HttpErrorResponse) => {
          this.createErrorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  openResolveModal(action: ResolveAction, request: IncidentRequestView): void {
    if (!request.canReview) return;

    this.resolveAction.set(action);
    this.resolveIncidentId.set(request.id);
    this.resolveIncidentLabel.set(`${request.employee} · ${request.type}`);
    this.resolveNote.set('');
    this.resolveErrorMessage.set(null);
    this.isResolveModalOpen.set(true);
  }

  closeResolveModal(): void {
    this.isResolveModalOpen.set(false);
  }

  submitResolve(): void {
    const incidentId = this.resolveIncidentId();
    const resolutionNote = this.resolveNote().trim();

    if (!incidentId) {
      this.resolveErrorMessage.set('No se pudo identificar la incidencia seleccionada.');
      return;
    }

    if (!resolutionNote) {
      this.resolveErrorMessage.set('Ingresa una nota de resolución.');
      return;
    }

    this.isResolving.set(true);
    this.resolveErrorMessage.set(null);

    const action = this.resolveAction();
    const request$ =
      action === 'APPROVE'
        ? this.incidentsApi.approveIncident(incidentId, { resolutionNote })
        : this.incidentsApi.rejectIncident(incidentId, { resolutionNote });

    request$
      .pipe(finalize(() => this.isResolving.set(false)))
      .subscribe({
        next: () => {
          this.isResolveModalOpen.set(false);
          this.successMessage.set(
            action === 'APPROVE'
              ? 'Incidencia aprobada correctamente.'
              : 'Incidencia rechazada correctamente.',
          );
          this.loadIncidents();
        },
        error: (error: HttpErrorResponse) => {
          this.resolveErrorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private loadIncidents(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request$ = this.isPrivilegedViewer()
      ? this.incidentsApi.getIncidents()
      : this.incidentsApi.getMyIncidents();

    request$
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (rows) => this.incidentsRaw.set(rows),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' · ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No se pudo completar la operación de incidencias.';
  }

  private normalizeStatus(status: string): IncidentStatus {
    if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') {
      return status;
    }
    return 'PENDING';
  }

  private isRegularizationType(requestType: string): boolean {
    const type = requestType.toUpperCase();
    return type.includes('REGULARIZATION') || type.includes('MISSING');
  }

  private typeIcon(requestType: string): string {
    const type = requestType.toUpperCase();
    if (type.includes('JUSTIFICATION') || type.includes('JUST')) return '📝';
    if (type.includes('PERMISSION') || type.includes('PERMISO')) return '🗓';
    if (this.isRegularizationType(type)) return '📋';
    return '📌';
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isCurrentMonth(value: string): boolean {
    const date = new Date(value);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    );
  }

  private getRoles(): string[] {
    const session = this.authSession.session();
    if (!session) return [];

    const fromRoles = session.user.roles ?? [];
    const fromRole = session.user.role ? [session.user.role] : [];
    return Array.from(new Set([...fromRoles, ...fromRole].map((item) => item.toUpperCase())));
  }
}
