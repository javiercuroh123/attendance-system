import { Component } from '@angular/core';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Configuracion General</h2>
      <p>
        Parametros globales del sistema: centro de trabajo, punto QR autorizado
        y reglas operativas base.
      </p>
    </section>
  `,
})
export class SettingsPage {}
