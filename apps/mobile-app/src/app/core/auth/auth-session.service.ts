import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AuthSession, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly accessTokenKey = 'mobile_access_token';
  private readonly refreshTokenKey = 'mobile_refresh_token';
  private readonly userKey = 'mobile_user';

  private readonly sessionState = signal<AuthSession | null>(this.readFromStorage());
  readonly session = this.sessionState.asReadonly();
  readonly authenticated = computed(() => Boolean(this.sessionState()?.accessToken));

  isAuthenticated(): boolean {
    return this.authenticated();
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

  getRefreshToken(): string | null {
    return this.sessionState()?.refreshToken ?? null;
  }

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readFromStorage(): AuthSession | null {
    if (!this.canUseStorage()) {
      return null;
    }

    const accessToken = localStorage.getItem(this.accessTokenKey);
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    const rawUser = localStorage.getItem(this.userKey);

    if (!accessToken || !refreshToken || !rawUser) {
      return null;
    }

    try {
      return {
        accessToken,
        refreshToken,
        user: JSON.parse(rawUser),
      };
    } catch {
      return null;
    }
  }
}
