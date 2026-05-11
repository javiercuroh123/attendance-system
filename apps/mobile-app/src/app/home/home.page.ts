import { NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarClearOutline,
  calendarNumberOutline,
  documentTextOutline,
  homeOutline,
  logInOutline,
  logOutOutline,
  notificationsOutline,
  personCircleOutline,
  personOutline,
  qrCodeOutline,
  timeOutline,
} from 'ionicons/icons';

type HomeStatus = 'none' | 'present' | 'late' | 'incomplete';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, NgClass],
})
export class HomePage implements OnInit, OnDestroy {
  protected readonly employeeName = 'Carlos Mendoza';
  protected readonly employeeInitials = 'CM';

  protected readonly checkInTime = '--:--';
  protected readonly checkOutTime = '--:--';

  protected readonly punctualCount = 14;
  protected readonly lateCount = 4;
  protected readonly absentCount = 1;

  protected readonly statusLabel = 'Sin marcacion';
  protected readonly statusClass: HomeStatus = 'none';

  protected greeting = 'Buenos dias';
  protected currentTime = '--:--:--';
  protected currentDate = '';
  protected monthLabel = '';

  private clockTimer: ReturnType<typeof setInterval> | null = null;

  private readonly timeFormatter = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  private readonly monthFormatter = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  });

  constructor() {
    addIcons({
      notificationsOutline,
      logInOutline,
      logOutOutline,
      qrCodeOutline,
      calendarClearOutline,
      documentTextOutline,
      personCircleOutline,
      timeOutline,
      homeOutline,
      calendarNumberOutline,
      personOutline,
    });
  }

  ngOnInit(): void {
    this.refreshRealtimeData();
    this.clockTimer = setInterval(() => {
      this.refreshRealtimeData();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer !== null) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private refreshRealtimeData(): void {
    const now = new Date();

    this.currentTime = this.timeFormatter.format(now);
    this.currentDate = this.capitalize(this.dateFormatter.format(now));
    this.monthLabel = this.capitalize(
      this.monthFormatter.format(now).replace(' de ', ' '),
    );
    this.greeting = this.resolveGreeting(now.getHours());
  }

  private resolveGreeting(hour: number): string {
    if (hour < 12) {
      return 'Buenos dias';
    }

    if (hour < 19) {
      return 'Buenas tardes';
    }

    return 'Buenas noches';
  }

  private capitalize(value: string): string {
    if (!value.length) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
