import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarNumberOutline,
  documentTextOutline,
  homeOutline,
  personOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-tab-footer',
  standalone: true,
  templateUrl: './tab-footer.component.html',
  styleUrls: ['./tab-footer.component.scss'],
  imports: [IonIcon, RouterLink, RouterLinkActive],
})
export class TabFooterComponent {
  constructor() {
    addIcons({
      homeOutline,
      calendarNumberOutline,
      documentTextOutline,
      personOutline,
    });
  }
}
