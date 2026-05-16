import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  mailOutline,
  qrCodeOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../core/auth/auth-api.service';
import { AuthSessionService } from '../core/auth/auth-session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonContent, IonIcon, ReactiveFormsModule, NgIf],
})
export class LoginPage {
  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected showPassword = false;
  protected isSubmitting = false;
  protected errorMessage: string | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authApi: AuthApiService,
    private readonly authSession: AuthSessionService,
  ) {
    addIcons({
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      qrCodeOutline,
    });
  }

  protected get showEmailError(): boolean {
    const emailControl = this.loginForm.controls.email;
    return emailControl.touched && emailControl.invalid;
  }

  protected get showPasswordError(): boolean {
    const passwordControl = this.loginForm.controls.password;
    return passwordControl.touched && passwordControl.invalid;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  protected async onSubmit(): Promise<void> {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(
        this.authApi.login(this.loginForm.getRawValue()),
      );
      this.authSession.setSession(response);

      const redirectTo = this.route.snapshot.queryParamMap.get('redirect');
      await this.router.navigateByUrl(redirectTo ?? '/home');
    } catch (error: unknown) {
      this.errorMessage = this.resolveErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = error.error?.message;

      if (Array.isArray(backendMessage) && backendMessage.length > 0) {
        return backendMessage.join(' · ');
      }

      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }
    }

    return 'No se pudo iniciar sesion. Verifica tus credenciales e intenta nuevamente.';
  }
}
