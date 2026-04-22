import { Component } from '@angular/core';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Asistencia</h2>
      <p>
        Consulta diaria y por trabajador, con ajustes manuales controlados para
        RR. HH. y administracion.
      </p>
    </section>
  `,
})
export class AttendancePage {}
