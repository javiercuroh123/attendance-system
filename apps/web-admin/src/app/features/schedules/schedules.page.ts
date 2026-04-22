import { Component } from '@angular/core';

@Component({
  selector: 'app-schedules-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Horarios</h2>
      <p>
        Configuracion de turnos, tolerancias y dias habiles para control de
        asistencia.
      </p>
    </section>
  `,
})
export class SchedulesPage {}
