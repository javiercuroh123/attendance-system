import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface DashboardEmployee {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  area_name?: string | null;
  status: string;
}

export interface DashboardAttendanceRecord {
  id: string;
  attendance_date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'INCOMPLETE' | 'JUSTIFIED' | string;
  late_minutes: number;
  source?: string | null;
  created_at: string;
  updated_at: string;
  employee: DashboardEmployee;
  qr_session?: { id: string } | null;
}

export interface DashboardIncident {
  id: string;
  attendance_date: string;
  request_type: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  created_at: string;
  reviewed_at?: string | null;
  employee: DashboardEmployee;
}

export interface DashboardAudit {
  id: string;
  module: string;
  action: string;
  entity_name: string;
  entity_id: string;
  created_at: string;
  new_data?: Record<string, unknown> | null;
}

export interface DashboardQrSession {
  id: string;
  starts_at: string;
  expires_at: string;
  status: string;
}

export interface ReportExportResponse {
  type: string;
  format: string;
  filename: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'https://attendance-system-production-0f0a.up.railway.app';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEmployees(): Observable<DashboardEmployee[]> {
    return this.http.get<DashboardEmployee[]>(`${this.baseUrl}/employees`, {
      headers: this.authHeaders(),
    });
  }

  getAttendance(filters: {
    from?: string;
    to?: string;
  }): Observable<DashboardAttendanceRecord[]> {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);

    return this.http.get<DashboardAttendanceRecord[]>(
      `${this.baseUrl}/attendance`,
      {
        headers: this.authHeaders(),
        params,
      },
    );
  }

  getMyAttendance(): Observable<DashboardAttendanceRecord[]> {
    return this.http.get<DashboardAttendanceRecord[]>(`${this.baseUrl}/attendance/me`, {
      headers: this.authHeaders(),
    });
  }

  getIncidents(): Observable<DashboardIncident[]> {
    return this.http.get<DashboardIncident[]>(`${this.baseUrl}/incidents`, {
      headers: this.authHeaders(),
    });
  }

  getMyIncidents(): Observable<DashboardIncident[]> {
    return this.http.get<DashboardIncident[]>(`${this.baseUrl}/incidents/me`, {
      headers: this.authHeaders(),
    });
  }

  getAudit(limit = 20): Observable<DashboardAudit[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<DashboardAudit[]>(`${this.baseUrl}/audit`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getActiveQrSessions(): Observable<DashboardQrSession[]> {
    const params = new HttpParams()
      .set('activeNow', 'true')
      .set('limit', '50');
    return this.http.get<DashboardQrSession[]>(`${this.baseUrl}/qr/sessions`, {
      headers: this.authHeaders(),
      params,
    });
  }

  exportDailyReport(date: string): Observable<ReportExportResponse> {
    const params = new HttpParams().set('type', 'daily').set('date', date);
    return this.http.get<ReportExportResponse>(`${this.baseUrl}/reports/export`, {
      headers: this.authHeaders(),
      params,
    });
  }
}
