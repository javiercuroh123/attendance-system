import { Component } from '@angular/core';

@Component({
  selector: 'app-incidents-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Incidencias</h2>
      <p>
        Gestion de regularizaciones, permisos y justificaciones con aprobacion o
        rechazo.
      </p>
    </section>
  `,
})
export class IncidentsPage {}
