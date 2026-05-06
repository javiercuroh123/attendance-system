import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export type UserRole = 'ADMIN' | 'RRHH' | 'SUPERVISOR' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole | string;
  status: UserStatus | string;
  created_at: string;
  last_login_at?: string | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserStatusPayload {
  status: UserStatus;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'http://localhost:3000';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}/users`, {
      headers: this.authHeaders(),
    });
  }

  createUser(payload: CreateUserPayload): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/users`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateUser(userId: string, payload: UpdateUserPayload): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/users/${userId}`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateUserStatus(
    userId: string,
    payload: UpdateUserStatusPayload,
  ): Observable<UserResponse> {
    return this.http.patch<UserResponse>(
      `${this.baseUrl}/users/${userId}/status`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }
}

