import { Component } from '@angular/core';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Reportes</h2>
      <p>
        Reportes diarios, mensuales, tardanzas y faltas con filtros por fecha,
        empleado y area.
      </p>
    </section>
  `,
})
export class ReportsPage {}
