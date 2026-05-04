# Endpoints Principales (Version Simple)

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Users

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`

## Settings

- `GET /settings`
- `PATCH /settings`

## Employees

- `GET /employees`
- `POST /employees`
- `GET /employees/:id`
- `PATCH /employees/:id`

## Schedules

- `GET /schedules`
- `POST /schedules`
- `GET /schedules/:id`
- `PATCH /schedules/:id`

## QR

- `POST /qr/sessions`
- `GET /qr/sessions/:id`
- `POST /qr/validate`

## Attendance

- `POST /attendance/check`
- `GET /attendance/me`
- `GET /attendance`
- `GET /attendance/:id`
- `PATCH /attendance/:id/manual-adjustment`

## Incidents

- `POST /incidents`
- `GET /incidents/me`
- `GET /incidents`
- `PATCH /incidents/:id/approve`
- `PATCH /incidents/:id/reject`

## Reports

- `GET /reports/daily`
- `GET /reports/monthly`
- `GET /reports/late`
- `GET /reports/absences`
- `GET /reports/export`

## Audit

- `GET /audit`
- `GET /audit/:entity/:id`
