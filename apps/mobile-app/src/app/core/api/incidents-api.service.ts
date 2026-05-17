import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../auth/auth-session.service';
import { resolveApiBaseUrl } from '../config/api-base-url';

export type IncidentType = 'REGULARIZATION' | 'PERMISSION' | 'JUSTIFICATION' | string;
export type IncidentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export interface IncidentEmployee {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
}

export interface IncidentReviewer {
  id: string;
  email: string;
}

export interface IncidentResponse {
  id: string;
  attendance_date: string;
  request_type: IncidentType;
  description: string;
  status: IncidentStatus;
  created_at: string;
  reviewed_at?: string | null;
  resolution_note?: string | null;
  employee: IncidentEmployee;
  reviewer?: IncidentReviewer | null;
}

export interface CreateIncidentPayload {
  attendanceDate: string;
  requestType: IncidentType;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly baseUrl = resolveApiBaseUrl();

  getMyIncidents(): Observable<IncidentResponse[]> {
    return this.http.get<IncidentResponse[]>(`${this.baseUrl}/incidents/me`, {
      headers: this.authHeaders(),
    });
  }

  createIncident(payload: CreateIncidentPayload): Observable<IncidentResponse> {
    return this.http.post<IncidentResponse>(
      `${this.baseUrl}/incidents`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.session.getAccessToken();
    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
