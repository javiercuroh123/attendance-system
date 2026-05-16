import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fileTrayOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import {
  IncidentResponse,
  IncidentStatus,
  IncidentType,
  IncidentsApiService,
} from '../core/api/incidents-api.service';
import { AuthSessionService } from '../core/auth/auth-session.service';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

type IncidentTab = 'list' | 'form';

interface IncidentItem {
  id: string;
  type: IncidentType;
  status: IncidentStatus;
  dateLabel: string;
  description: string;
}

@Component({
  selector: 'app-incidents',
  templateUrl: './incidents.page.html',
  styleUrls: ['./incidents.page.scss'],
  imports: [IonContent, IonIcon, NgIf, NgFor, NgClass, FormsModule, PageHeaderComponent],
})
export class IncidentsPage implements OnInit {
  protected activeTab: IncidentTab = 'form';
  protected incidents: IncidentItem[] = [];
  protected isLoading = false;
  protected isSubmitting = false;
  protected errorMessage: string | null = null;

  protected form = {
    attendanceDate: this.todayToInputDate(),
    requestType: '' as '' | IncidentType,
    description: '',
  };

  constructor(
    private readonly incidentsApi: IncidentsApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {
    addIcons({
      fileTrayOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadIncidents();
  }

  protected async setTab(tab: IncidentTab): Promise<void> {
    this.activeTab = tab;

    if (tab === 'list' && this.incidents.length === 0 && !this.isLoading) {
      await this.loadIncidents();
    }
  }

  protected async submitIncident(): Promise<void> {
    const { attendanceDate, requestType, description } = this.form;
    const cleanDescription = description.trim();

    if (
      !attendanceDate ||
      !requestType ||
      !cleanDescription ||
      this.isSubmitting
    ) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const created = await firstValueFrom(
        this.incidentsApi.createIncident({
          attendanceDate,
          requestType,
          description: cleanDescription,
        }),
      );

      this.incidents.unshift(this.mapIncident(created));

      this.form = {
        attendanceDate: this.todayToInputDate(),
        requestType: '',
        description: '',
      };

      this.activeTab = 'list';
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.session.clearSession();
        await this.router.navigateByUrl('/login');
        return;
      }

      this.errorMessage = this.resolveErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  protected typeLabel(type: IncidentType): string {
    if (type === 'REGULARIZATION') {
      return 'Regularizacion';
    }

    if (type === 'PERMISSION') {
      return 'Permiso';
    }

    return 'Justificacion';
  }

  protected typeClass(type: IncidentType): string {
    if (type === 'REGULARIZATION') {
      return 'regularization';
    }

    if (type === 'PERMISSION') {
      return 'permission';
    }

    return 'justification';
  }

  protected statusLabel(status: IncidentStatus): string {
    if (status === 'PENDING') {
      return 'Pendiente';
    }

    if (status === 'APPROVED') {
      return 'Aprobada';
    }

    if (status === 'REJECTED') {
      return 'Rechazada';
    }

    return status;
  }

  protected statusClass(status: IncidentStatus): string {
    if (status === 'PENDING') {
      return 'pending';
    }

    if (status === 'APPROVED') {
      return 'approved';
    }

    if (status === 'REJECTED') {
      return 'rejected';
    }

    return 'pending';
  }

  private async loadIncidents(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(this.incidentsApi.getMyIncidents());
      this.incidents = response.map((incident) => this.mapIncident(incident));
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.session.clearSession();
        await this.router.navigateByUrl('/login');
        return;
      }

      this.incidents = [];
      this.errorMessage = this.resolveErrorMessage(error);
    } finally {
      this.isLoading = false;
    }
  }

  private mapIncident(incident: IncidentResponse): IncidentItem {
    return {
      id: incident.id,
      type: incident.request_type,
      status: incident.status,
      dateLabel: this.toDateLabel(incident.attendance_date),
      description: incident.description,
    };
  }

  private todayToInputDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateLabel(inputDate: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      const [year, month, day] = inputDate.split('-');
      return `${day}/${month}/${year}`;
    }

    const parsed = new Date(inputDate);
    if (Number.isNaN(parsed.getTime())) {
      return inputDate;
    }

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = error.error?.message;

      if (Array.isArray(backendMessage) && backendMessage.length > 0) {
        return backendMessage.join(' · ');
      }

      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }
    }

    return 'No se pudo procesar la solicitud de incidencias.';
  }
}
