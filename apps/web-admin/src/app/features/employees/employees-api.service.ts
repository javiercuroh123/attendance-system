import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface EmployeeUserResponse {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface EmployeeSupervisorResponse {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
}

export interface EmployeeScheduleResponse {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  tolerance_minutes: number;
  work_days: string;
  status: string;
}

export interface EmployeeResponse {
  id: string;
  user: EmployeeUserResponse;
  code: string;
  dni: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  area_name?: string | null;
  position?: string | null;
  supervisor?: EmployeeSupervisorResponse | null;
  schedule?: EmployeeScheduleResponse | null;
  hire_date?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreatePayload {
  userId: string;
  code: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone?: string;
  areaName?: string;
  position?: string;
  supervisorId?: string;
  scheduleId?: string;
  hireDate?: string;
  status?: string;
}

export interface EmployeeUpdatePayload {
  userId?: string;
  code?: string;
  dni?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  areaName?: string;
  position?: string;
  supervisorId?: string;
  scheduleId?: string;
  hireDate?: string;
  status?: string;
}

export interface AdminUserOption {
  id: string;
  email: string;
  status: string;
  last_login_at?: string | null;
  created_at: string;
  role: string;
}

export interface WorkScheduleOption {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  tolerance_minutes: number;
  work_days: string;
  status: string;
}

export interface AttendanceSummaryRecord {
  id: string;
  attendance_date: string;
  status: string;
  employee: {
    id: string;
  };
}

@Injectable({ providedIn: 'root' })
export class EmployeesApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'http://localhost:3000';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEmployees(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.baseUrl}/employees`, {
      headers: this.authHeaders(),
    });
  }

  createEmployee(payload: EmployeeCreatePayload): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.baseUrl}/employees`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateEmployee(
    employeeId: string,
    payload: EmployeeUpdatePayload,
  ): Observable<EmployeeResponse> {
    return this.http.patch<EmployeeResponse>(
      `${this.baseUrl}/employees/${employeeId}`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }

  getUsers(): Observable<AdminUserOption[]> {
    return this.http.get<AdminUserOption[]>(`${this.baseUrl}/users`, {
      headers: this.authHeaders(),
    });
  }

  getSchedules(): Observable<WorkScheduleOption[]> {
    return this.http.get<WorkScheduleOption[]>(`${this.baseUrl}/schedules`, {
      headers: this.authHeaders(),
    });
  }

  getAttendance(params: {
    from?: string;
    to?: string;
  }): Observable<AttendanceSummaryRecord[]> {
    let query = new HttpParams();
    if (params.from) query = query.set('from', params.from);
    if (params.to) query = query.set('to', params.to);

    return this.http.get<AttendanceSummaryRecord[]>(`${this.baseUrl}/attendance`, {
      headers: this.authHeaders(),
      params: query,
    });
  }
}
