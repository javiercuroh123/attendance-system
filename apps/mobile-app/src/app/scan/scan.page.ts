import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import {
  Barcode,
  BarcodeFormat,
  BarcodeScanner,
  LensFacing,
} from '@capacitor-mlkit/barcode-scanning';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  flashOutline,
  scanOutline,
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
export class ScanPage implements OnInit, OnDestroy {
  @ViewChild('previewVideo')
  private previewVideoRef?: ElementRef<HTMLVideoElement>;

  protected showResult = false;
  protected isSubmitting = false;
  protected isScannerSupported = false;
  protected isScannerActive = false;
  protected isPreparingScanner = false;
  protected scannerMessage = 'La camara aun no esta activa.';
  protected scannerActionLabel = 'Activar Camara';
  protected qrToken = '';
  protected errorMessage: string | null = null;
  protected resultTitle = 'Marcacion registrada';
  protected resultDescription = 'Se envio correctamente tu asistencia.';
  protected readonly usesNativeScanner: boolean;

  private readonly platform = Capacitor.getPlatform();
  private readonly isNative = this.platform === 'android' || this.platform === 'ios';

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private barcodesListener: PluginListenerHandle | null = null;
  private scanErrorListener: PluginListenerHandle | null = null;
  private handlingScannedCode = false;

  constructor(
    private readonly attendanceApi: AttendanceApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {
    this.usesNativeScanner = this.isNative;

    addIcons({
      arrowBackOutline,
      flashOutline,
      checkmarkCircleOutline,
      scanOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.initializeScanner();
    if (this.isScannerSupported) {
      await this.startScanner();
    }
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
    void this.stopScanner();
  }

  protected async toggleScanner(): Promise<void> {
    if (this.isPreparingScanner) {
      return;
    }

    if (this.isScannerActive) {
      await this.stopScanner();
      return;
    }

    await this.startScanner();
  }

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private async initializeScanner(): Promise<void> {
    try {
      const { supported } = await BarcodeScanner.isSupported();
      this.isScannerSupported = supported;
      if (!supported) {
        this.scannerMessage =
          'Este navegador o dispositivo no soporta escaneo QR en tiempo real.';
      } else {
        this.scannerMessage = this.isNative
          ? 'Usa la camara para leer el QR y registrar asistencia.'
          : 'Activa la camara y apunta al QR para deteccion automatica.';
      }
    } catch {
      this.isScannerSupported = false;
      this.scannerMessage =
        'No se pudo inicializar el escaner en este dispositivo.';
    }
  }

  private async startScanner(): Promise<void> {
    if (!this.isScannerSupported) {
      this.errorMessage = 'El escaner de camara no esta disponible.';
      return;
    }

    this.isPreparingScanner = true;
    this.errorMessage = null;
    this.scannerMessage = 'Inicializando camara...';

    try {
      const permissionGranted = await this.ensureCameraPermission();
      if (!permissionGranted) {
        this.errorMessage =
          'Se necesita permiso de camara para escanear el codigo QR.';
        this.scannerMessage = 'Permiso de camara denegado.';
        return;
      }

      await this.detachScannerListeners();

      this.barcodesListener = await BarcodeScanner.addListener(
        'barcodesScanned',
        (event) => { void this.handleDetectedBarcodes(event.barcodes); },
      );
      this.scanErrorListener = await BarcodeScanner.addListener(
        'scanError',
        (event) => { this.errorMessage = event.message || 'Error al escanear el codigo QR.'; },
      );

      if (this.isNative) {
        document.body.classList.add('barcode-scanner-active');
        await BarcodeScanner.startScan({
          formats: [BarcodeFormat.QrCode],
          lensFacing: LensFacing.Back,
        });
      } else {
        const previewVideo = this.previewVideoRef?.nativeElement;
        if (!previewVideo) {
          this.errorMessage = 'No se pudo crear la vista previa de camara.';
          this.scannerMessage = 'No hay vista previa disponible.';
          return;
        }
        await BarcodeScanner.startScan({
          formats: [BarcodeFormat.QrCode],
          lensFacing: LensFacing.Back,
          videoElement: previewVideo,
        });
      }

      this.isScannerActive = true;
      this.scannerActionLabel = 'Detener Camara';
      this.scannerMessage = 'Camara activa. Apunta al QR para detectarlo.';
    } catch (error: unknown) {
      this.errorMessage = this.resolveErrorMessage(error);
      this.scannerMessage = 'No se pudo iniciar la camara.';
      await this.stopScanner();
    } finally {
      this.isPreparingScanner = false;
    }
  }

  private async stopScanner(): Promise<void> {
    if (this.isNative) {
      document.body.classList.remove('barcode-scanner-active');
    }
    try {
      await BarcodeScanner.stopScan();
    } catch {
      // Ignorado para no bloquear cierre de pantalla.
    } finally {
      await this.detachScannerListeners();
      this.isScannerActive = false;
      this.scannerActionLabel = 'Activar Camara';

      if (!this.errorMessage) {
        this.scannerMessage = this.isScannerSupported
          ? 'La camara aun no esta activa.'
          : this.scannerMessage;
      }
    }
  }

  private async detachScannerListeners(): Promise<void> {
    if (this.barcodesListener) {
      await this.barcodesListener.remove().catch(() => undefined);
      this.barcodesListener = null;
    }

    if (this.scanErrorListener) {
      await this.scanErrorListener.remove().catch(() => undefined);
      this.scanErrorListener = null;
    }
  }

  private async handleDetectedBarcodes(barcodes: Barcode[]): Promise<void> {
    if (this.handlingScannedCode || !barcodes.length) {
      return;
    }

    const detectedToken = this.extractTokenFromBarcodes(barcodes);
    if (!detectedToken) {
      return;
    }

    this.handlingScannedCode = true;
    this.qrToken = detectedToken;
    this.scannerMessage = 'QR detectado. Registrando asistencia...';

    try {
      await this.stopScanner();
      await this.submitAttendanceCheck();
    } finally {
      this.handlingScannedCode = false;
    }
  }

  private extractTokenFromBarcodes(barcodes: Barcode[]): string | null {
    for (const barcode of barcodes) {
      const rawCandidate = barcode.rawValue?.trim();
      if (rawCandidate) {
        const parsedToken = this.extractQrToken(rawCandidate);
        if (parsedToken) {
          return parsedToken;
        }
      }

      const displayCandidate = barcode.displayValue?.trim();
      if (displayCandidate) {
        const parsedToken = this.extractQrToken(displayCandidate);
        if (parsedToken) {
          return parsedToken;
        }
      }
    }

    return null;
  }

  private async ensureCameraPermission(): Promise<boolean> {
    const permission = await BarcodeScanner.requestPermissions();
    return permission.camera === 'granted' || permission.camera === 'limited';
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

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'No se pudo registrar la marcacion en este momento.';
  }
}
