import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface SystemSettingsResponse {
  id: string;
  company_name: string;
  worksite_name: string;
  worksite_address?: string | null;
  worksite_latitude?: number | null;
  worksite_longitude?: number | null;
  qr_point_description?: string | null;
  default_timezone: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateSystemSettingsPayload {
  companyName?: string;
  worksiteName?: string;
  worksiteAddress?: string | null;
  worksiteLatitude?: number | null;
  worksiteLongitude?: number | null;
  qrPointDescription?: string | null;
  defaultTimezone?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'https://attendance-system-production-0f0a.up.railway.app';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSettings(): Observable<SystemSettingsResponse> {
    return this.http.get<SystemSettingsResponse>(`${this.baseUrl}/settings`, {
      headers: this.authHeaders(),
    });
  }

  updateSettings(
    payload: UpdateSystemSettingsPayload,
  ): Observable<SystemSettingsResponse> {
    return this.http.patch<SystemSettingsResponse>(
      `${this.baseUrl}/settings`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }
}
