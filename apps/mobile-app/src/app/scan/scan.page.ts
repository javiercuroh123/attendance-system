import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  flashOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { AttendanceApiService } from '../core/api/attendance-api.service';
import { AuthSessionService } from '../core/auth/auth-session.service';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, FormsModule, NgIf],
})
export class ScanPage implements OnDestroy {
  protected showResult = false;
  protected isSubmitting = false;
  protected qrToken = '';
  protected errorMessage: string | null = null;
  protected resultTitle = 'Marcacion registrada';
  protected resultDescription = 'Se envio correctamente tu asistencia.';

  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly attendanceApi: AttendanceApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {
    addIcons({
      arrowBackOutline,
      flashOutline,
      checkmarkCircleOutline,
    });
  }

  async submitAttendanceCheck(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const qrToken = this.extractQrToken(this.qrToken.trim());
    if (!qrToken) {
      this.errorMessage =
        'Ingresa un token QR valido para registrar tu marcacion.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(
        this.attendanceApi.check({
          qrToken,
          deviceTime: new Date().toISOString(),
          deviceInfo: this.buildDeviceInfo(),
        }),
      );

      this.resultTitle =
        response.attendanceType === 'CHECK_OUT'
          ? 'Salida registrada'
          : 'Entrada registrada';
      this.resultDescription = this.resolveResultDescription(
        response.status,
        response.lateMinutes,
      );

      this.showResult = true;
      this.qrToken = '';
      this.clearCloseTimer();
      this.closeTimer = setTimeout(() => {
        this.showResult = false;
        void this.router.navigateByUrl('/home');
      }, 1600);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.session.clearSession();
        await this.router.navigateByUrl('/login');
        return;
      }

      this.errorMessage = this.resolveErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  ngOnDestroy(): void {
    this.clearCloseTimer();
  }

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private buildDeviceInfo(): Record<string, unknown> {
    const nav = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const userAgent = navigator.userAgent ?? '';
    const platform = nav.userAgentData?.platform ?? navigator.platform ?? 'unknown';

    return {
      platform,
      userAgent,
      appVersion: '1.0.0',
    };
  }

  private extractQrToken(rawValue: string): string | null {
    if (!rawValue) {
      return null;
    }

    if (!rawValue.startsWith('{')) {
      return rawValue;
    }

    try {
      const parsed = JSON.parse(rawValue) as { qrToken?: unknown };
      if (typeof parsed.qrToken === 'string' && parsed.qrToken.trim()) {
        return parsed.qrToken.trim();
      }
    } catch {
      return null;
    }

    return null;
  }

  private resolveResultDescription(status: string, lateMinutes: number): string {
    if (status === 'LATE' && lateMinutes > 0) {
      return `Marcacion con tardanza de ${lateMinutes} minuto(s).`;
    }

    if (status === 'INCOMPLETE') {
      return 'Entrada registrada. Falta marcar la salida.';
    }

    return 'Se envio correctamente tu asistencia.';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = error.error?.message;

      if (Array.isArray(backendMessage) && backendMessage.length > 0) {
        return backendMessage.join(' · ');
      }

      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }
    }

    return 'No se pudo registrar la marcacion en este momento.';
  }
}
