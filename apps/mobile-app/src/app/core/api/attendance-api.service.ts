import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from '../auth/auth-session.service';

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'INCOMPLETE'
  | 'JUSTIFIED'
  | string;

export interface AttendanceSchedule {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  tolerance_minutes: number;
}

export interface AttendanceEmployee {
  id: string;
  code: string;
  dni: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  position?: string | null;
  area_name?: string | null;
  hire_date?: string | null;
  status: string;
  schedule?: AttendanceSchedule | null;
}

export interface AttendanceRecordResponse {
  id: string;
  attendance_date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status: AttendanceStatus;
  late_minutes: number;
  source?: string | null;
  created_at: string;
  updated_at: string;
  employee: AttendanceEmployee;
}

export interface CheckAttendancePayload {
  qrToken: string;
  deviceTime?: string;
  deviceInfo?: Record<string, unknown>;
}

export interface CheckAttendanceResponse {
  success: boolean;
  attendanceType: 'CHECK_IN' | 'CHECK_OUT' | string;
  status: AttendanceStatus;
  lateMinutes: number;
  serverTime: string;
  recordId: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly baseUrl = environment.apiBaseUrl;

  getMyAttendance(): Observable<AttendanceRecordResponse[]> {
    return this.http.get<AttendanceRecordResponse[]>(
      `${this.baseUrl}/attendance/me`,
      {
        headers: this.authHeaders(),
      },
    );
  }

  check(payload: CheckAttendancePayload): Observable<CheckAttendanceResponse> {
    return this.http.post<CheckAttendanceResponse>(
      `${this.baseUrl}/attendance/check`,
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
