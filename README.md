# Attendance System (Version Simple)

Sistema de control de asistencia con QR basado en los documentos:

- `LEVANTAMIENTO FUNCIONAL INICIAL SIMPLE`
- `DISEÑO TÉCNICO DEL SISTEMA SIMPLE`

## Arquitectura de workspace

```
attendance-system/
├── apps/
│   ├── web-admin/
│   ├── mobile-app/
│   └── api/
├── packages/
│   ├── shared-types/
│   ├── shared-dtos/
│   ├── shared-utils/
│   └── attendance-rules/
├── docs/
│   ├── functional/
│   ├── technical/
│   └── api/
└── infra/
```

## Backend (NestJS)

Modulos principales:

- `auth`
- `users`
- `roles-permissions`
- `areas`
- `settings`
- `schedules`
- `employees`
- `qr`
- `attendance`
- `incidents`
- `reports`
- `audit`
- `notifications`

Se eliminan del alcance simple:

- `branches`
- `clients`
- `projects`

## Frontend Web (Angular)

Estructura funcional implementada:

- `features/auth`
- `features/dashboard`
- `features/employees`
- `features/areas`
- `features/schedules`
- `features/attendance`
- `features/incidents`
- `features/reports`
- `features/settings`

## App Movil (Ionic + Angular)

Rutas base implementadas:

- `/login`
- `/home`
- `/scan`
- `/my-attendance`
- `/incidents`
- `/profile`

## Ejecucion rapida

### API

```bash
cd apps/api
npm install
npm run start:dev
```

Swagger:

- `http://localhost:3000/api-docs`

### Web Admin

```bash
cd apps/web-admin
npm install
npm run build
npm start
```

### Mobile App

```bash
cd apps/mobile-app
npm install
npm run build
npm start
```
