import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface QrIssuedByUser {
  id: string;
  email: string;
}

export interface QrSessionResponse {
  id: string;
  starts_at: string;
  expires_at: string;
  point_description?: string | null;
  status: string;
  created_at: string;
  issued_by?: string;
  issued_by_user?: QrIssuedByUser;
}

export interface CreateQrSessionPayload {
  validitySeconds?: number;
  qrPointDescription?: string;
}

export interface CreateQrSessionResponse {
  id: string;
  startsAt: string;
  expiresAt: string;
  qrToken: string;
  qrPayload: {
    qrToken: string;
    qrSessionId: string;
    pointDescription?: string | null;
    worksiteName: string;
    expiresAt: string;
  };
}

@Injectable({ providedIn: 'root' })
export class QrSessionsApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'http://localhost:3000';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSessions(limit = 100): Observable<QrSessionResponse[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<QrSessionResponse[]>(`${this.baseUrl}/qr/sessions`, {
      headers: this.authHeaders(),
      params,
    });
  }

  createSession(
    payload: CreateQrSessionPayload,
  ): Observable<CreateQrSessionResponse> {
    return this.http.post<CreateQrSessionResponse>(
      `${this.baseUrl}/qr/sessions`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }
}
