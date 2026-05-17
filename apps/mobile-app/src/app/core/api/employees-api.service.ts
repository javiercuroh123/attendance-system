import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../auth/auth-session.service';
import { resolveApiBaseUrl } from '../config/api-base-url';

export interface EmployeeProfileUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface EmployeeProfileSchedule {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  tolerance_minutes: number;
}

export interface EmployeeProfileSupervisor {
  id: string;
  first_name: string;
  last_name: string;
}

export interface EmployeeProfileResponse {
  id: string;
  code: string;
  dni: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  area_name?: string | null;
  position?: string | null;
  hire_date?: string | null;
  status: string;
  user: EmployeeProfileUser;
  supervisor?: EmployeeProfileSupervisor | null;
  schedule?: EmployeeProfileSchedule | null;
}

@Injectable({ providedIn: 'root' })
export class EmployeesApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly baseUrl = resolveApiBaseUrl();

  getMyProfile(): Observable<EmployeeProfileResponse> {
    return this.http.get<EmployeeProfileResponse>(`${this.baseUrl}/employees/me`, {
      headers: this.authHeaders(),
    });
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
