import { Component } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular/standalone';
import { TabFooterComponent } from '../shared/tab-footer/tab-footer.component';

@Component({
  selector: 'app-tabs-shell',
  templateUrl: './tabs-shell.page.html',
  styleUrls: ['./tabs-shell.page.scss'],
  imports: [IonRouterOutlet, TabFooterComponent],
})
export class TabsShellPage {}
