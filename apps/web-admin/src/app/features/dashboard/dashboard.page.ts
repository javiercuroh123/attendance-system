import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Dashboard</h2>
      <p>
        Vista de resumen del dia: presentes, tardanzas, faltas e incidencias
        pendientes.
      </p>
    </section>
  `,
})
export class DashboardPage {}
