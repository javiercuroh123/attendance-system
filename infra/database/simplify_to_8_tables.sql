BEGIN;

-- 1) users.role (un solo rol por usuario)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role varchar DEFAULT 'EMPLOYEE';

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL
     AND to_regclass('public.roles') IS NOT NULL THEN
    UPDATE users u
    SET role = COALESCE(
      (
        SELECT r.code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id
        ORDER BY CASE r.code
          WHEN 'ADMIN' THEN 1
          WHEN 'RRHH' THEN 2
          WHEN 'SUPERVISOR' THEN 3
          ELSE 4
        END
        LIMIT 1
      ),
      'EMPLOYEE'
    )
    WHERE role IS NULL;
  END IF;
END
$$;

-- 2) employees.area_name (texto) y employees.schedule_id directo
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS area_name varchar;

DO $$
BEGIN
  IF to_regclass('public.areas') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'employees'
         AND column_name = 'area_id'
     ) THEN
    UPDATE employees e
    SET area_name = a.name
    FROM areas a
    WHERE e.area_id = a.id
      AND (e.area_name IS NULL OR e.area_name = '');
  END IF;
END
$$;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS schedule_id uuid;

DO $$
BEGIN
  IF to_regclass('public.employee_schedule_assignments') IS NOT NULL THEN
    UPDATE employees e
    SET schedule_id = src.schedule_id
    FROM (
      SELECT DISTINCT ON (employee_id)
        employee_id,
        schedule_id
      FROM employee_schedule_assignments
      WHERE status = 'ACTIVE'
      ORDER BY employee_id, valid_from DESC, created_at DESC
    ) AS src
    WHERE e.id = src.employee_id
      AND e.schedule_id IS NULL;
  END IF;
END
$$;

ALTER TABLE employees
  DROP COLUMN IF EXISTS area_id CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_employees_schedule_id_work_schedules'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_schedule_id_work_schedules
      FOREIGN KEY (schedule_id)
      REFERENCES work_schedules(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- 3) normalizar estados de asistencia al nuevo modelo
UPDATE attendance_records
SET status = 'PRESENT'
WHERE status IN ('ON_TIME', 'COMPLETE');

UPDATE attendance_records
SET status = 'ABSENT'
WHERE status = 'ABSENCE';

UPDATE attendance_records
SET status = 'INCOMPLETE'
WHERE status = 'INCIDENCE';

UPDATE attendance_records
SET source = 'QR'
WHERE source = 'APP_MOBILE';

-- 4) eliminar tablas no usadas en el modelo simplificado (8 tablas)
DROP TABLE IF EXISTS attendance_events;
DROP TABLE IF EXISTS employee_schedule_assignments;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS areas;

COMMIT;
