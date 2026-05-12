import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { TabFooterComponent } from '../shared/tab-footer/tab-footer.component';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  businessOutline,
  calendarOutline,
  callOutline,
  chevronForwardOutline,
  codeSlashOutline,
  idCardOutline,
  informationCircleOutline,
  keyOutline,
  logOutOutline,
  mailOutline,
  timeOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, TabFooterComponent],
})
export class ProfilePage {
  protected readonly employeeInitials = 'CM';
  protected readonly employeeName = 'Carlos Mendoza';
  protected readonly employeeRole = 'Empleado';

  constructor() {
    addIcons({
      idCardOutline,
      mailOutline,
      callOutline,
      codeSlashOutline,
      briefcaseOutline,
      businessOutline,
      timeOutline,
      calendarOutline,
      keyOutline,
      informationCircleOutline,
      logOutOutline,
      chevronForwardOutline,
    });
  }

  protected onUtilityAction(): void {
    // Placeholder intencional para acciones futuras del perfil.
  }
}
