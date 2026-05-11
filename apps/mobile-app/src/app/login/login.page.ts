import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  mailOutline,
  qrCodeOutline,
} from 'ionicons/icons';

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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
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

    try {
      await this.delay(650);
      await this.router.navigateByUrl('/home');
    } finally {
      this.isSubmitting = false;
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
