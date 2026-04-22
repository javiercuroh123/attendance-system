# Diseño Tecnico del Sistema (Simple)

## Stack

- Web: Angular
- Movil: Ionic + Angular
- Backend: NestJS
- Base de datos: PostgreSQL

## Arquitectura

- Cliente Web Administrativo
- Cliente Movil
- API Backend central
- Base de datos relacional

## Modulos backend

- `auth`
- `users`
- `roles-permissions`
- `employees`
- `areas`
- `settings`
- `schedules`
- `qr`
- `attendance`
- `incidents`
- `reports`
- `audit`
- `notifications`

## Modelo base de datos (tablas principales)

- `users`
- `roles`
- `user_roles`
- `areas`
- `employees`
- `system_settings`
- `work_schedules`
- `employee_schedule_assignments`
- `qr_sessions`
- `attendance_records`
- `attendance_events`
- `incident_requests`
- `audit_logs`
- `notifications`

## Reglas tecnicas de asistencia

- Si no existe check-in, registrar entrada.
- Si existe check-in y no check-out, registrar salida.
- Si ya existen ambos, rechazar marcacion.
- Tardanza por `server_time > start_time + tolerance`.
- Ajuste manual solo por `ADMIN` y `RRHH`, con auditoria.

## Seguridad

- JWT access token + refresh token
- RBAC por rol
- Auditoria de operaciones sensibles

## Criterio de simplificacion

No se implementa `branches`, `branch_id` ni modulo de sedes. Todo se rige por `system_settings` para centro de trabajo unico.
