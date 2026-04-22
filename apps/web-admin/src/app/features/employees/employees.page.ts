import { Component } from '@angular/core';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Empleados</h2>
      <p>
        Registro, edicion, estado y detalle de colaboradores con su area y
        horario asignado.
      </p>
    </section>
  `,
})
export class EmployeesPage {}
