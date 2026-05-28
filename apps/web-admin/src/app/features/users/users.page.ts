import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import {
  CreateUserPayload,
  UpdateUserPayload,
  UserResponse,
  UserRole,
  UsersApiService,
  UserStatus,
} from './users-api.service';

type RoleFilter = 'ALL' | UserRole;
type StatusFilter = 'ALL' | UserStatus;
type FormMode = 'CREATE' | 'EDIT';

interface UserRowView {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
}

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly usersApi = inject(UsersApiService);
  private readonly authSession = inject(AuthSessionService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isTogglingStatus = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly formErrorMessage = signal<string | null>(null);

  readonly usersRaw = signal<UserResponse[]>([]);

  readonly searchTerm = signal('');
  readonly roleFilter = signal<RoleFilter>('ALL');
  readonly statusFilter = signal<StatusFilter>('ALL');

  readonly isFormModalOpen = signal(false);
  readonly formMode = signal<FormMode>('CREATE');
  readonly editingUserId = signal('');

  readonly formEmail = signal('');
  readonly formPassword = signal('');
  readonly formRole = signal<UserRole>('EMPLOYEE');
  readonly formStatus = signal<UserStatus>('ACTIVE');

  readonly isAdmin = computed(() => this.getRoles().includes('ADMIN'));

  readonly rows = computed<UserRowView[]>(() =>
    this.usersRaw().map((user) => this.mapUserToView(user)),
  );

  readonly filteredRows = computed<UserRowView[]>(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const roleFilter = this.roleFilter();
    const statusFilter = this.statusFilter();

    return this.rows().filter((row) => {
      if (roleFilter !== 'ALL' && row.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;

      if (!query) return true;

      const source = `${row.email} ${row.role} ${row.status}`.toLowerCase();
      return source.includes(query);
    });
  });

  constructor() {
    if (!this.isAdmin()) {
      this.errorMessage.set('Solo ADMIN puede acceder al módulo Usuarios.');
      return;
    }
    this.loadUsers();
  }

  refresh(): void {
    if (!this.isAdmin()) {
      this.errorMessage.set('Solo ADMIN puede acceder al módulo Usuarios.');
      return;
    }
    this.loadUsers();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' };
    return map[status] ?? status;
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setRoleFilter(value: string): void {
    if (
      value === 'ALL' ||
      value === 'ADMIN' ||
      value === 'RRHH' ||
      value === 'SUPERVISOR' ||
      value === 'EMPLOYEE'
    ) {
      this.roleFilter.set(value);
    }
  }

  setStatusFilter(value: string): void {
    if (value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE') {
      this.statusFilter.set(value);
    }
  }

  openCreateModal(): void {
    if (!this.isAdmin()) {
      this.errorMessage.set('Solo ADMIN puede registrar usuarios.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.formErrorMessage.set(null);
    this.formMode.set('CREATE');
    this.editingUserId.set('');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formRole.set('EMPLOYEE');
    this.formStatus.set('ACTIVE');
    this.isFormModalOpen.set(true);
  }

  openEditModal(userId: string): void {
    if (!this.isAdmin()) return;

    const user = this.usersRaw().find((item) => item.id === userId);
    if (!user) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.formErrorMessage.set(null);
    this.formMode.set('EDIT');
    this.editingUserId.set(user.id);
    this.formEmail.set(user.email);
    this.formPassword.set('');
    this.formRole.set(this.normalizeRole(user.role));
    this.formStatus.set(this.normalizeStatus(user.status));
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
  }

  submitForm(): void {
    if (!this.isAdmin()) {
      this.formErrorMessage.set('No tienes permisos para gestionar usuarios.');
      return;
    }
    if (this.isSaving()) return;

    this.formErrorMessage.set(null);
    this.successMessage.set(null);

    if (this.formMode() === 'CREATE') {
      const payload = this.buildCreatePayload();
      if (!payload) return;

      this.isSaving.set(true);
      this.usersApi
        .createUser(payload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.isFormModalOpen.set(false);
            this.successMessage.set('Usuario creado correctamente.');
            this.loadUsers();
          },
          error: (error: HttpErrorResponse) => {
            this.formErrorMessage.set(this.extractErrorMessage(error));
          },
        });
      return;
    }

    const userId = this.editingUserId();
    if (!userId) {
      this.formErrorMessage.set('No se pudo identificar el usuario a editar.');
      return;
    }

    const payload = this.buildUpdatePayload();
    if (!payload) return;

    this.isSaving.set(true);
    this.usersApi
      .updateUser(userId, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.isFormModalOpen.set(false);
          this.successMessage.set('Usuario actualizado correctamente.');
          this.loadUsers();
        },
        error: (error: HttpErrorResponse) => {
          this.formErrorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  toggleStatus(row: UserRowView): void {
    if (!this.isAdmin()) return;
    if (this.isTogglingStatus()) return;

    const nextStatus: UserStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.isTogglingStatus.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.usersApi
      .updateUserStatus(row.id, { status: nextStatus })
      .pipe(finalize(() => this.isTogglingStatus.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Estado actualizado a ${nextStatus}.`);
          this.loadUsers();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  isEditing(row: UserRowView): boolean {
    return this.formMode() === 'EDIT' && this.editingUserId() === row.id;
  }

  private loadUsers(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.usersApi
      .getUsers()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (rows) => this.usersRaw.set(rows),
        error: (error: HttpErrorResponse) => {
          this.usersRaw.set([]);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private buildCreatePayload(): CreateUserPayload | null {
    const email = this.formEmail().trim().toLowerCase();
    const password = this.formPassword().trim();
    const role = this.formRole();
    const status = this.formStatus();

    if (!this.isValidEmail(email)) {
      this.formErrorMessage.set('Ingresa un correo válido.');
      return null;
    }

    if (password.length < 6) {
      this.formErrorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return null;
    }

    this.formErrorMessage.set(null);

    return { email, password, role, status };
  }

  private buildUpdatePayload(): UpdateUserPayload | null {
    const email = this.formEmail().trim().toLowerCase();
    const password = this.formPassword().trim();
    const role = this.formRole();
    const status = this.formStatus();

    if (!this.isValidEmail(email)) {
      this.formErrorMessage.set('Ingresa un correo válido.');
      return null;
    }

    if (password.length > 0 && password.length < 6) {
      this.formErrorMessage.set(
        'Si deseas cambiar la contraseña, debe tener al menos 6 caracteres.',
      );
      return null;
    }

    const payload: UpdateUserPayload = {
      email,
      role,
      status,
    };

    if (password.length > 0) {
      payload.password = password;
    }

    this.formErrorMessage.set(null);
    return payload;
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private mapUserToView(user: UserResponse): UserRowView {
    return {
      id: user.id,
      email: user.email,
      role: this.normalizeRole(user.role),
      status: this.normalizeStatus(user.status),
      createdAt: this.formatDateTime(user.created_at),
      lastLoginAt: user.last_login_at
        ? this.formatDateTime(user.last_login_at)
        : 'Nunca',
    };
  }

  private normalizeRole(role: string): UserRole {
    if (
      role === 'ADMIN' ||
      role === 'RRHH' ||
      role === 'SUPERVISOR' ||
      role === 'EMPLOYEE'
    ) {
      return role;
    }
    return 'EMPLOYEE';
  }

  private normalizeStatus(status: string): UserStatus {
    if (status === 'ACTIVE' || status === 'INACTIVE') return status;
    return 'INACTIVE';
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' · ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No se pudo completar la operación de usuarios.';
  }

  private getRoles(): string[] {
    const session = this.authSession.session();
    if (!session) return [];

    const fromRoles = session.user.roles ?? [];
    const fromRole = session.user.role ? [session.user.role] : [];
    return Array.from(new Set([...fromRoles, ...fromRole].map((item) => item.toUpperCase())));
  }
}
