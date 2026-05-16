import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from './auth-session.service';
import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from './auth.models';

export interface AuthMeResponse extends AuthUser {
  lastLoginAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly baseUrl = environment.apiBaseUrl;

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  refresh(payload: RefreshTokenRequest): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(
      `${this.baseUrl}/auth/refresh`,
      payload,
    );
  }

  me(): Observable<AuthMeResponse> {
    return this.http.get<AuthMeResponse>(`${this.baseUrl}/auth/me`, {
      headers: this.authHeaders(),
    });
  }

  logout(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.baseUrl}/auth/logout`,
      {},
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
