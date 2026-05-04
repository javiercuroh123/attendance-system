import { PLATFORM_ID, Injectable, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthSession, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly accessTokenKey = 'web_admin_access_token';
  private readonly refreshTokenKey = 'web_admin_refresh_token';
  private readonly userKey = 'web_admin_user';

  private readonly sessionState = signal<AuthSession | null>(this.readFromStorage());
  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.sessionState()?.accessToken);

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readFromStorage(): AuthSession | null {
    if (!this.canUseStorage()) return null;

    const accessToken = localStorage.getItem(this.accessTokenKey);
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    const rawUser = localStorage.getItem(this.userKey);

    if (!accessToken || !refreshToken || !rawUser) return null;

    try {
      const user = JSON.parse(rawUser);
      return { accessToken, refreshToken, user };
    } catch {
      return null;
    }
  }

  setSession(payload: LoginResponse): void {
    const session: AuthSession = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };

    if (this.canUseStorage()) {
      localStorage.setItem(this.accessTokenKey, session.accessToken);
      localStorage.setItem(this.refreshTokenKey, session.refreshToken);
      localStorage.setItem(this.userKey, JSON.stringify(session.user));
    }

    this.sessionState.set(session);
  }

  clearSession(): void {
    if (this.canUseStorage()) {
      localStorage.removeItem(this.accessTokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);
    }

    this.sessionState.set(null);
  }

  getAccessToken(): string | null {
    return this.sessionState()?.accessToken ?? null;
  }
}
