import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface IncidentEmployee {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  area_name?: string | null;
}

export interface IncidentReviewer {
  id: string;
  email: string;
}

export interface IncidentResponse {
  id: string;
  attendance_date: string;
  request_type: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  created_at: string;
  reviewed_at?: string | null;
  resolution_note?: string | null;
  employee: IncidentEmployee;
  reviewer?: IncidentReviewer | null;
}

export interface CreateIncidentPayload {
  attendanceDate: string;
  requestType: string;
  description: string;
}

export interface ResolveIncidentPayload {
  resolutionNote: string;
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'https://attendance-system-production-0f0a.up.railway.app';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getIncidents(filters?: {
    status?: string;
    attendanceDate?: string;
  }): Observable<IncidentResponse[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.attendanceDate) {
      params = params.set('attendanceDate', filters.attendanceDate);
    }

    return this.http.get<IncidentResponse[]>(`${this.baseUrl}/incidents`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getMyIncidents(): Observable<IncidentResponse[]> {
    return this.http.get<IncidentResponse[]>(`${this.baseUrl}/incidents/me`, {
      headers: this.authHeaders(),
    });
  }

  createIncident(payload: CreateIncidentPayload): Observable<IncidentResponse> {
    return this.http.post<IncidentResponse>(`${this.baseUrl}/incidents`, payload, {
      headers: this.authHeaders(),
    });
  }

  approveIncident(
    incidentId: string,
    payload: ResolveIncidentPayload,
  ): Observable<IncidentResponse> {
    return this.http.patch<IncidentResponse>(
      `${this.baseUrl}/incidents/${incidentId}/approve`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }

  rejectIncident(
    incidentId: string,
    payload: ResolveIncidentPayload,
  ): Observable<IncidentResponse> {
    return this.http.patch<IncidentResponse>(
      `${this.baseUrl}/incidents/${incidentId}/reject`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }
}
