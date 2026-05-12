import { Component, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkCircleOutline, flashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  imports: [IonContent, IonIcon, RouterLink],
})
export class ScanPage implements OnDestroy {
  protected showResult = false;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly router: Router) {
    addIcons({
      arrowBackOutline,
      flashOutline,
      checkmarkCircleOutline,
    });
  }

  protected simulateScan(): void {
    if (this.showResult) {
      return;
    }

    this.showResult = true;
    this.clearCloseTimer();
    this.closeTimer = setTimeout(() => {
      this.showResult = false;
      void this.router.navigateByUrl('/home');
    }, 1400);
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
}
