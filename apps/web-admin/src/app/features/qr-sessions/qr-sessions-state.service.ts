import { Injectable, signal } from '@angular/core';

export interface LastGeneratedInfo {
  sessionId: string;
  qrToken: string;
  qrPayloadText: string;
  point: string;
  validitySeconds: number;
}

@Injectable({ providedIn: 'root' })
export class QrSessionsStateService {
  readonly lastGenerated = signal<LastGeneratedInfo | null>(null);
  readonly qrImageDataUrl = signal<string | null>(null);

  set(info: LastGeneratedInfo, imageDataUrl: string): void {
    this.lastGenerated.set(info);
    this.qrImageDataUrl.set(imageDataUrl);
  }

  clear(): void {
    this.lastGenerated.set(null);
    this.qrImageDataUrl.set(null);
  }
}
