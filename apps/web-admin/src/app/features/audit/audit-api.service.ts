import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface AuditActorResponse {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface AuditLogResponse {
  id: string;
  actor_user_id: string;
  actor_user?: AuditActorResponse | null;
  module: string;
  action: string;
  entity_name: string;
  entity_id: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  status: string;
  ip_address?: string | null;
  device_info?: Record<string, unknown> | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'https://attendance-system-production-0f0a.up.railway.app';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAuditLogs(params?: { limit?: number; module?: string }): Observable<AuditLogResponse[]> {
    let query = new HttpParams();
    if (params?.limit !== undefined) query = query.set('limit', String(params.limit));
    if (params?.module) query = query.set('module', params.module);

    return this.http.get<AuditLogResponse[]>(`${this.baseUrl}/audit`, {
      headers: this.authHeaders(),
      params: query,
    });
  }
}
