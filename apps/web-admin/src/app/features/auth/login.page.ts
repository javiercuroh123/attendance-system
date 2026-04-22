import { Component } from '@angular/core';

@Component({
  selector: 'app-login-page',
  standalone: true,
  template: `
    <section class="feature-page">
      <h2>Autenticacion</h2>
      <p>
        Este modulo concentra inicio de sesion, cierre de sesion y recuperacion
        de contrasena para el panel administrativo.
      </p>
    </section>
  `,
})
export class LoginPage {}
