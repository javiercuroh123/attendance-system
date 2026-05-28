import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth/auth-api.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private token = '';

  readonly isSubmitting = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly tokenMissing = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
  );

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParamMap.get('token');
    if (!tokenParam) {
      this.tokenMissing.set(true);
      return;
    }
    this.token = tokenParam;
  }

  get passwordsMismatch(): boolean {
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return (
      this.form.controls.confirmPassword.touched &&
      newPassword !== confirmPassword
    );
  }

  togglePassword(): void { this.showPassword.update((v) => !v); }
  toggleConfirm(): void { this.showConfirm.update((v) => !v); }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authApi
      .resetPassword(this.token, newPassword)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (res) => {
          this.successMessage.set(res.message);
          setTimeout(() => void this.router.navigateByUrl('/auth/login'), 2500);
        },
        error: (error: HttpErrorResponse) => {
          const msg = error.error?.message;
          this.errorMessage.set(
            typeof msg === 'string' ? msg : 'No se pudo restablecer la contraseña. El enlace puede haber expirado.',
          );
        },
      });
  }
}
