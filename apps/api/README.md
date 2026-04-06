# API Backend Integrado - Sistema de Asistencia con QR

## Qué contiene
Este paquete integra el backend mejorado sobre la estructura real de tu proyecto NestJS:
- `src/` con módulos alineados al documento funcional y técnico.
- `package.json` actualizado con dependencias faltantes para validación DTO.
- `nest-cli.json` y `tsconfig.json` tomados de tu proyecto.
- `tsconfig.build.json` para compilación más limpia.
- `.env.example` con variables base.

## Módulos incluidos
- auth
- users
- roles-permissions
- clients
- branches
- projects
- schedules
- employees
- qr
- attendance
- incidents
- reports
- audit

## Endpoints clave
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /users`
- `POST /users`
- `PATCH /users/:id/status`
- `GET /employees/:id/schedule`
- `POST /employees/:id/schedule`
- `POST /qr/sessions`
- `POST /qr/validate`
- `POST /attendance/check`
- `GET /attendance/me`
- `PATCH /attendance/:id/manual-adjustment`
- `POST /incidents`
- `PATCH /incidents/:id/approve`
- `PATCH /incidents/:id/reject`
- `GET /reports/daily`
- `GET /reports/monthly`
- `GET /reports/late`
- `GET /reports/absences`
- `GET /reports/export`
- `GET /audit`
- `GET /audit/:entity/:id`

## Ajustes hechos sobre tu base
1. Se integró el backend mejorado con tu estructura real NestJS.
2. Se añadieron `class-validator` y `class-transformer`, necesarias para los DTOs y `ValidationPipe`.
3. Se dejó Swagger en `/api-docs`.
4. Se configuró TypeORM con variables de entorno.
5. Se dejó listo un `.env.example`.

## Instalación sugerida
```bash
npm install
cp .env.example .env
npm run start:dev
```

## Observaciones
- Aún faltan migraciones reales para producción.
- La exportación quedó en CSV base.
- Para producción conviene desactivar `synchronize` y usar migraciones.


## Corrección aplicada por compatibilidad con TypeScript
Se corrigieron imports de tipos a `import type` para evitar errores `TS1272` cuando `isolatedModules` y `emitDecoratorMetadata` están activos.

## Si aparece error de columnas faltantes en PostgreSQL
Si sale algo como `column Role.description does not exist`, el problema ya no es TypeScript sino que tu base de datos tiene una estructura antigua y no coincide con las entidades actuales.

En desarrollo, la forma más rápida de alinear el esquema es:
1. usar una base nueva, o vaciar la actual;
2. poner temporalmente `DB_SYNCHRONIZE=true` en `.env`;
3. arrancar una vez la app para que TypeORM cree/ajuste tablas;
4. volver a `DB_SYNCHRONIZE=false`.

Si ya tienes datos que no quieres perder, no uses synchronize: allí corresponde migración manual.
