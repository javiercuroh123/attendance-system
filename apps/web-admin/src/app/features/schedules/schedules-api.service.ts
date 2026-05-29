import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface ScheduleResponse {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  tolerance_minutes: number;
  work_days: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreatePayload {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  workDays: string;
  status?: string;
}

export interface ScheduleUpdatePayload {
  code?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  toleranceMinutes?: number;
  workDays?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class SchedulesApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'https://attendance-system-production-0f0a.up.railway.app';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSchedules(): Observable<ScheduleResponse[]> {
    return this.http.get<ScheduleResponse[]>(`${this.baseUrl}/schedules`, {
      headers: this.authHeaders(),
    });
  }

  createSchedule(payload: ScheduleCreatePayload): Observable<ScheduleResponse> {
    return this.http.post<ScheduleResponse>(`${this.baseUrl}/schedules`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateSchedule(
    scheduleId: string,
    payload: ScheduleUpdatePayload,
  ): Observable<ScheduleResponse> {
    return this.http.patch<ScheduleResponse>(
      `${this.baseUrl}/schedules/${scheduleId}`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }
}
