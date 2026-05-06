import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

interface QrSessionRow {
  id: string;
  issuedBy: string;
  point: string;
  startsAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

@Component({
  selector: 'app-qr-sessions-page',
  standalone: true,
  templateUrl: './qr-sessions.page.html',
  styleUrl: './qr-sessions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrSessionsPage {
  private readonly destroyRef = inject(DestroyRef);

  readonly rows: QrSessionRow[] = [
    {
      id: 'QRS-0041',
      issuedBy: 'Javier Alvarado',
      point: 'Entrada principal',
      startsAt: '08:00 AM',
      expiresAt: '08:10 AM',
      status: 'EXPIRED',
    },
    {
      id: 'QRS-0042',
      issuedBy: 'Javier Alvarado',
      point: 'Entrada principal',
      startsAt: '08:10 AM',
      expiresAt: '08:20 AM',
      status: 'ACTIVE',
    },
    {
      id: 'QRS-0038',
      issuedBy: 'Javier Alvarado',
      point: 'Entrada principal',
      startsAt: 'Ayer 08:00',
      expiresAt: 'Ayer 08:10',
      status: 'EXPIRED',
    },
    {
      id: 'QRS-0035',
      issuedBy: 'Javier Alvarado',
      point: 'Entrada principal',
      startsAt: 'Ayer 08:00',
      expiresAt: '—',
      status: 'CANCELLED',
    },
  ];

  readonly activeSessionId = 'QRS-0042';
  readonly activeSessionPoint = 'Entrada principal';
  readonly expiresInSeconds = signal(179);

  readonly countdownLabel = computed(() =>
    this.expiresInSeconds() <= 60 ? 'Expira pronto' : 'Expira en',
  );

  readonly countdownDisplay = computed(() => {
    const total = this.expiresInSeconds();
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  constructor() {
    const timerId = setInterval(() => {
      this.expiresInSeconds.update((value) => (value <= 0 ? 300 : value - 1));
    }, 1000);

    this.destroyRef.onDestroy(() => {
      clearInterval(timerId);
    });
  }
}
