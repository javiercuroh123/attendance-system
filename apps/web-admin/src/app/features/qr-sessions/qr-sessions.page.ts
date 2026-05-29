import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import * as QRCode from 'qrcode';
import {
  CreateQrSessionPayload,
  CreateQrSessionResponse,
  QrSessionResponse,
  QrSessionsApiService,
} from './qr-sessions-api.service';
import { QrSessionsStateService } from './qr-sessions-state.service';

type QrVisualStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

interface QrSessionRow {
  id: string;
  issuedBy: string;
  point: string;
  startsAt: string;
  expiresAt: string;
  status: QrVisualStatus;
}

@Component({
  selector: 'app-qr-sessions-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-sessions.page.html',
  styleUrl: './qr-sessions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrSessionsPage {
  private readonly qrApi = inject(QrSessionsApiService);
  private readonly qrState = inject(QrSessionsStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isLoading = signal(false);
  readonly isGenerating = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly sessionsRaw = signal<QrSessionResponse[]>([]);
  readonly nowMs = signal(Date.now());

  readonly lastGenerated = this.qrState.lastGenerated;
  readonly qrImageDataUrl = this.qrState.qrImageDataUrl;

  readonly rows = computed<QrSessionRow[]>(() =>
    this.sessionsRaw().map((item) => this.mapToRow(item)),
  );

  readonly activeSession = computed(() => {
    const now = this.nowMs();
    return this.sessionsRaw().find((item) => this.deriveStatus(item, now) === 'ACTIVE') ?? null;
  });

  readonly activeSessionId = computed(() => this.activeSession()?.id ?? '');
  readonly activeSessionPoint = computed(
    () => this.activeSession()?.point_description?.trim() || 'Punto no definido',
  );

  readonly countdownSeconds = computed(() => {
    const active = this.activeSession();
    if (!active) return 0;
    const diff = Math.floor((new Date(active.expires_at).getTime() - this.nowMs()) / 1000);
    return diff > 0 ? diff : 0;
  });

  readonly countdownLabel = computed(() => {
    if (!this.activeSession()) return 'Sin sesión activa';
    return this.countdownSeconds() <= 60 ? 'Expira pronto' : 'Expira en';
  });

  readonly countdownDisplay = computed(() => {
    if (!this.activeSession()) return '--:--';
    const total = this.countdownSeconds();
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  readonly visibleQrToken = computed(() => {
    const generated = this.lastGenerated();
    const activeId = this.activeSession()?.id;
    if (!generated || !activeId || generated.sessionId !== activeId) return null;
    return generated.qrToken;
  });

  readonly visibleQrPayloadText = computed(() => {
    const generated = this.lastGenerated();
    const activeId = this.activeSession()?.id;
    if (!generated || !activeId || generated.sessionId !== activeId) return null;
    return generated.qrPayloadText;
  });

  readonly visibleQrImageDataUrl = computed(() => {
    const generated = this.lastGenerated();
    const activeId = this.activeSession()?.id;
    if (!generated || !activeId || generated.sessionId !== activeId) return null;
    return this.qrImageDataUrl();
  });

  readonly isCreateModalOpen = signal(false);
  readonly formPointDescription = signal('Entrada principal');
  readonly formValiditySeconds = signal(60);

  constructor() {
    this.loadSessions();

    const timerId = setInterval(() => {
      this.nowMs.set(Date.now());
    }, 1000);

    this.destroyRef.onDestroy(() => {
      clearInterval(timerId);
    });
  }

  openCreateModal(): void {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  refreshSessions(): void {
    this.loadSessions();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'Activo',
      EXPIRED: 'Expirado',
      CANCELLED: 'Cancelado',
    };
    return map[status] ?? status;
  }

  submitCreateSession(): void {
    const point = this.formPointDescription().trim();
    const rawValidity = Number(this.formValiditySeconds());

    if (Number.isNaN(rawValidity) || rawValidity < 30 || rawValidity > 300) {
      this.errorMessage.set('La vigencia debe estar entre 30 y 300 segundos.');
      return;
    }

    this.generateSession({
      validitySeconds: rawValidity,
      qrPointDescription: point || 'Entrada principal',
    });
  }

  regenerateSession(): void {
    const activePoint = this.activeSession()?.point_description?.trim();
    const generated = this.lastGenerated();

    const fallbackPoint =
      activePoint || generated?.point || this.formPointDescription() || 'Entrada principal';
    const fallbackValidity = generated?.validitySeconds ?? 60;

    this.generateSession({
      validitySeconds: fallbackValidity,
      qrPointDescription: fallbackPoint,
    });
  }

  copyVisiblePayload(): void {
    const payloadText = this.visibleQrPayloadText();
    if (!payloadText) return;
    if (!isPlatformBrowser(this.platformId)) return;

    void navigator.clipboard
      .writeText(payloadText)
      .then(() => {
        this.successMessage.set('Payload QR copiado al portapapeles.');
      })
      .catch(() => {
        this.errorMessage.set('No se pudo copiar el payload QR al portapapeles.');
      });
  }

  private generateSession(payload: CreateQrSessionPayload): void {
    if (this.isGenerating()) return;

    this.isGenerating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.qrApi
      .createSession(payload)
      .pipe(finalize(() => this.isGenerating.set(false)))
      .subscribe({
        next: (response) => {
          this.handleCreatedSession(response, payload);
          this.isCreateModalOpen.set(false);
          this.loadSessions();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private loadSessions(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.qrApi
      .getSessions(120)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (rows) => {
          this.sessionsRaw.set(rows);
          const hasActive = rows.some((item) => this.deriveStatus(item, this.nowMs()) === 'ACTIVE');
          if (!hasActive) {
            this.qrState.clear();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
          this.sessionsRaw.set([]);
        },
      });
  }

  private handleCreatedSession(
    response: CreateQrSessionResponse,
    payload: CreateQrSessionPayload,
  ): void {
    const point =
      response.qrPayload?.pointDescription ??
      payload.qrPointDescription ??
      'Entrada principal';

    const info = {
      sessionId: response.id,
      qrToken: response.qrToken,
      qrPayloadText: JSON.stringify(response.qrPayload, null, 2),
      point,
      validitySeconds: payload.validitySeconds ?? 60,
    };
    void this.renderQrImage(response.qrToken, info);

    this.successMessage.set(`Sesión QR ${response.id} generada correctamente.`);
  }

  private async renderQrImage(
    qrToken: string,
    info: { sessionId: string; qrToken: string; qrPayloadText: string; point: string; validitySeconds: number },
  ): Promise<void> {
    try {
      const dataUrl = await QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 512,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      this.qrState.set(info, dataUrl);
    } catch {
      this.qrState.clear();
      this.errorMessage.set(
        'No se pudo renderizar el código QR. Regenera la sesión nuevamente.',
      );
    }
  }

  private mapToRow(item: QrSessionResponse): QrSessionRow {
    const status = this.deriveStatus(item, this.nowMs());
    return {
      id: item.id,
      issuedBy: this.formatIssuedBy(item),
      point: item.point_description?.trim() || 'Punto no definido',
      startsAt: this.formatDateTime(item.starts_at),
      expiresAt: this.formatDateTime(item.expires_at),
      status,
    };
  }

  private deriveStatus(item: QrSessionResponse, nowMs: number): QrVisualStatus {
    const rawStatus = (item.status || '').toUpperCase();
    if (rawStatus === 'CANCELLED') return 'CANCELLED';
    if (rawStatus !== 'ACTIVE') return 'EXPIRED';

    const expiresAtMs = new Date(item.expires_at).getTime();
    if (Number.isNaN(expiresAtMs)) return 'EXPIRED';

    return nowMs >= expiresAtMs ? 'EXPIRED' : 'ACTIVE';
  }

  private formatIssuedBy(item: QrSessionResponse): string {
    const email = item.issued_by_user?.email?.trim();
    if (!email) return 'Usuario del sistema';

    const localPart = email.split('@')[0] ?? email;
    const clean = localPart.replace(/[._-]+/g, ' ').trim();
    if (!clean) return email;

    return clean
      .split(' ')
      .filter((segment) => segment.length > 0)
      .map((segment) => segment[0].toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    const now = new Date();
    const sameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const time = date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (sameDay) return time;
    if (isYesterday) return `Ayer ${time}`;

    const day = date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${day} ${time}`;
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' · ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No se pudo completar la operación de sesiones QR.';
  }
}
