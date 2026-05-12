import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  businessOutline,
  calendarNumberOutline,
  calendarOutline,
  callOutline,
  chevronForwardOutline,
  codeSlashOutline,
  documentTextOutline,
  homeOutline,
  idCardOutline,
  informationCircleOutline,
  keyOutline,
  logOutOutline,
  mailOutline,
  personOutline,
  timeOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonContent, IonIcon, RouterLink],
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
      homeOutline,
      calendarNumberOutline,
      documentTextOutline,
      personOutline,
    });
  }

  protected onUtilityAction(): void {
    // Placeholder intencional para acciones futuras del perfil.
  }
}
