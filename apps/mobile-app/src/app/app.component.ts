import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  protected splashHidden = false;

  constructor() {}

  ngOnInit(): void {
    const platform = Capacitor.getPlatform();
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.add('mobile-app-runtime');

    if (platform === 'android') {
      document.body.classList.add('mobile-app-android');
    } else if (platform === 'ios') {
      document.body.classList.add('mobile-app-ios');
    }

    setTimeout(() => {
      this.splashHidden = true;
    }, 2400);
  }
}
