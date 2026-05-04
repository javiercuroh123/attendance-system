# Levantamiento Funcional Inicial (Simple)

## Objetivo general

Desarrollar un sistema web y movil para registrar, controlar y supervisar la asistencia del personal mediante codigos QR con trazabilidad y seguridad.

## Alcance funcional incluido

- Autenticacion de usuarios
- Gestion de usuarios con rol simple
- Gestion de empleados
- Configuracion general del sistema
- Gestion de horarios y asignacion directa al empleado
- Generacion y validacion de QR
- Escaneo desde app movil
- Registro de entrada y salida
- Control de tardanzas y faltas
- Historial de asistencia
- Solicitudes de regularizacion
- Reportes administrativos
- Auditoria basica

## Fuera de alcance en primera etapa

- Integracion con planillas
- Biometria facial
- Firma digital
- Integracion ERP
- Calculo completo de remuneraciones
- Geocercas avanzadas
- Offline complejo sincronizado

## Roles

- `ADMIN`
- `RRHH`
- `SUPERVISOR`
- `EMPLOYEE`

## Reglas de negocio clave

1. Una entrada y una salida por dia como flujo minimo.
2. Tolerancia configurable en minutos para tardanza.
3. Falta cuando no hay entrada ni justificacion aprobada.
4. QR con vigencia limitada y validacion backend.
5. Sin duplicidad de entradas o salidas consecutivas.
6. Regularizacion con aprobacion de supervisor o RR. HH.
7. Auditoria de operaciones sensibles.

## Criterio de simplificacion

El sistema opera con un unico centro de trabajo autorizado. No se implementa gestion multisede ni entidad `branches`.
No se implementan tablas separadas de roles, areas, eventos de asistencia ni notificaciones internas en el MVP.
