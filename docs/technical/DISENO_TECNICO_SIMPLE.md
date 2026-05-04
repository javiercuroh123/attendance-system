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
- `employees`
- `settings`
- `schedules`
- `qr`
- `attendance`
- `incidents`
- `reports`
- `audit`

## Modelo base de datos simplificado (8 tablas)

- `users`
- `employees`
- `system_settings`
- `work_schedules`
- `qr_sessions`
- `attendance_records`
- `incident_requests`
- `audit_logs`

## Reglas tecnicas de asistencia

- Si no existe check-in, registrar entrada.
- Si existe check-in y no check-out, registrar salida.
- Si ya existen ambos, rechazar marcacion.
- Tardanza por `server_time > start_time + tolerance`.
- Ajuste manual solo por `ADMIN` y `RRHH`, con auditoria.

## Seguridad

- JWT access token + refresh token
- RBAC por rol simple en `users.role`
- Auditoria de operaciones sensibles

## Criterio de simplificacion

No se implementa `branches`, `branch_id` ni modulo de sedes. Todo se rige por `system_settings` para centro de trabajo unico.
No se implementa tabla de `areas`; se usa `employees.area_name` como texto.
No se implementa tabla intermedia de horarios; se usa `employees.schedule_id`.
No se implementa `attendance_events`; entrada y salida se registran en `attendance_records`.
