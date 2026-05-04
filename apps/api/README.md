# API Backend - Sistema de Asistencia con QR (Version Simple)

Backend NestJS alineado al levantamiento funcional y diseno tecnico simple.

## Modulos incluidos

- `auth`
- `users`
- `settings`
- `schedules`
- `employees`
- `qr`
- `attendance`
- `incidents`
- `reports`
- `audit`

## Tablas finales del modelo simplificado

- `users`
- `employees`
- `system_settings`
- `work_schedules`
- `qr_sessions`
- `attendance_records`
- `incident_requests`
- `audit_logs`

## Modulos retirados del alcance simple

- `branches`
- `clients`
- `projects`

## Swagger

- Ruta: `/api-docs`
- URL local: `http://localhost:3000/api-docs`

## Endpoints clave

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /users`
- `PATCH /settings`
- `POST /employees`
- `POST /qr/sessions`
- `POST /attendance/check`
- `POST /incidents`
- `GET /reports/daily`
- `GET /audit`

## Ejecucion local

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Nota de base de datos

Si cambiaste el modelo y tu base viene de una version anterior, usa una BD limpia para desarrollo o habilita temporalmente:

- `DB_SYNCHRONIZE=true`

Luego vuelve a `false` para evitar cambios automaticos en entornos estables.
