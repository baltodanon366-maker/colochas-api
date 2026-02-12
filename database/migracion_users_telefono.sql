-- Migración: users de email/password_hash a name + telefono (8 dígitos)
-- Ejecutar sobre una BD que ya tenga la tabla users con email y password_hash.
-- Para instalación nueva usar create_database.sql que ya tiene la estructura correcta.

-- 1. Añadir columna telefono
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR(8);

-- 2. Rellenar telefono para usuarios existentes (ejemplo: 8 dígitos derivados del id o fijo)
-- Ajustar según tus datos; aquí usamos un valor por defecto para no dejar NULL
UPDATE users SET telefono = LPAD((id::text || '000000'), 8, '0') WHERE telefono IS NULL;
UPDATE users SET telefono = '12345678' WHERE id = 1 AND telefono = '10000000'; -- admin típico

-- 3. Hacer telefono NOT NULL y UNIQUE
ALTER TABLE users ALTER COLUMN telefono SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telefono ON users(telefono);

-- 4. Eliminar columnas antiguas
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- 5. Eliminar índice antiguo de email si existía
DROP INDEX IF EXISTS idx_users_email;
