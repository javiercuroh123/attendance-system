import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface AttendanceEmployee {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  area_name?: string | null;
  status: string;
}

export interface AttendanceQrSessionRef {
  id: string;
}

export interface AttendanceRecordResponse {
  id: string;
  attendance_date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'INCOMPLETE' | 'JUSTIFIED' | string;
  late_minutes: number;
  source?: string | null;
  employee: AttendanceEmployee;
  qr_session?: AttendanceQrSessionRef | null;
}

export interface IncidentResponse {
  id: string;
  attendance_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  employee: AttendanceEmployee;
}

export interface ManualAdjustmentPayload {
  checkInAt?: string;
  checkOutAt?: string;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'https://attendance-system-production-0f0a.up.railway.app';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAttendance(filters: {
    from?: string;
    to?: string;
    status?: string;
  }): Observable<AttendanceRecordResponse[]> {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.status) params = params.set('status', filters.status);

    return this.http.get<AttendanceRecordResponse[]>(`${this.baseUrl}/attendance`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getMyAttendance(): Observable<AttendanceRecordResponse[]> {
    return this.http.get<AttendanceRecordResponse[]>(`${this.baseUrl}/attendance/me`, {
      headers: this.authHeaders(),
    });
  }

  getEmployees(): Observable<AttendanceEmployee[]> {
    return this.http.get<AttendanceEmployee[]>(`${this.baseUrl}/employees`, {
      headers: this.authHeaders(),
    });
  }

  getApprovedIncidentsByDate(attendanceDate: string): Observable<IncidentResponse[]> {
    const params = new HttpParams()
      .set('attendanceDate', attendanceDate)
      .set('status', 'APPROVED');
    return this.http.get<IncidentResponse[]>(`${this.baseUrl}/incidents`, {
      headers: this.authHeaders(),
      params,
    });
  }

  manualAdjustment(
    attendanceId: string,
    payload: ManualAdjustmentPayload,
  ): Observable<AttendanceRecordResponse> {
    return this.http.patch<AttendanceRecordResponse>(
      `${this.baseUrl}/attendance/${attendanceId}/manual-adjustment`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }
}
