import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

const LOOPBACK_HOSTS = new Set(['', 'localhost', '127.0.0.1', '::1']);

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveHostFromBrowser(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const host = window.location.hostname.trim().toLowerCase();
  if (LOOPBACK_HOSTS.has(host)) {
    return null;
  }

  return host;
}

export function resolveApiBaseUrl(): string {
  const hostFromBrowser = resolveHostFromBrowser();
  if (hostFromBrowser) {
    return trimTrailingSlash(
      `${environment.apiProtocol}://${hostFromBrowser}:${environment.apiPort}`,
    );
  }

  const platform = Capacitor.getPlatform();
  if (
    (platform === 'android' || platform === 'ios') &&
    environment.nativeApiHost.trim()
  ) {
    return trimTrailingSlash(
      `${environment.apiProtocol}://${environment.nativeApiHost}:${environment.apiPort}`,
    );
  }

  return trimTrailingSlash(environment.apiBaseUrl);
}
