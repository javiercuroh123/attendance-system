import { Component } from '@angular/core';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  template: `
    <section class="module-page">
      <h2>Empleados</h2>
      <p>
        Registro, edición, estado y detalle de colaboradores con su área y
        horario asignado.
      </p>
    </section>
  `,
  styles: `
    .module-page {
      background: #ffffff;
      border: 1px solid #e9ecef;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      padding: 20px;
    }

    .module-page h2 {
      margin: 0 0 6px;
      font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
      font-size: 22px;
      font-weight: 400;
      color: #0d1117;
    }

    .module-page p {
      margin: 0;
      color: #6c757d;
      font-size: 13px;
      line-height: 1.55;
    }
  `,
})
export class EmployeesPage {}
