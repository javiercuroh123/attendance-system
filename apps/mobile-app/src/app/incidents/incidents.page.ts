import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarNumberOutline,
  documentTextOutline,
  fileTrayOutline,
  homeOutline,
  personOutline,
} from 'ionicons/icons';

type IncidentTab = 'list' | 'form';
type IncidentType = 'REGULARIZATION' | 'PERMISSION' | 'JUSTIFICATION';
type IncidentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface IncidentItem {
  type: IncidentType;
  status: IncidentStatus;
  dateLabel: string;
  description: string;
}

@Component({
  selector: 'app-incidents',
  templateUrl: './incidents.page.html',
  styleUrls: ['./incidents.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, NgIf, NgFor, NgClass, FormsModule],
})
export class IncidentsPage {
  protected activeTab: IncidentTab = 'form';

  protected readonly incidents: IncidentItem[] = [
    {
      type: 'REGULARIZATION',
      status: 'PENDING',
      dateLabel: '11/05/2026',
      description: 'Olvide registrar mi salida por reunion externa con proveedor.',
    },
    {
      type: 'PERMISSION',
      status: 'APPROVED',
      dateLabel: '07/05/2026',
      description: 'Solicitud de permiso por cita medica en horario laboral.',
    },
    {
      type: 'JUSTIFICATION',
      status: 'REJECTED',
      dateLabel: '03/05/2026',
      description: 'Justificacion por tardanza sin evidencia de transporte.',
    },
  ];

  protected form = {
    attendanceDate: this.todayToInputDate(),
    requestType: '' as '' | IncidentType,
    description: '',
  };

  constructor() {
    addIcons({
      fileTrayOutline,
      homeOutline,
      calendarNumberOutline,
      documentTextOutline,
      personOutline,
    });
  }

  protected setTab(tab: IncidentTab): void {
    this.activeTab = tab;
  }

  protected submitIncident(): void {
    const { attendanceDate, requestType, description } = this.form;

    if (!attendanceDate || !requestType || !description.trim()) {
      return;
    }

    this.incidents.unshift({
      type: requestType,
      status: 'PENDING',
      dateLabel: this.toDateLabel(attendanceDate),
      description: description.trim(),
    });

    this.form = {
      attendanceDate: this.todayToInputDate(),
      requestType: '',
      description: '',
    };

    this.activeTab = 'list';
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

    return 'Rechazada';
  }

  protected statusClass(status: IncidentStatus): string {
    if (status === 'PENDING') {
      return 'pending';
    }

    if (status === 'APPROVED') {
      return 'approved';
    }

    return 'rejected';
  }

  private todayToInputDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateLabel(inputDate: string): string {
    const [year, month, day] = inputDate.split('-');
    return `${day}/${month}/${year}`;
  }
}
