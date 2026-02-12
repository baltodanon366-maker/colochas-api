-- Migración: permitir hard delete de usuarios
-- Al eliminar un usuario se borran sus ventas (y detalles). Turnos/sorteos quedan con creador/realizador NULL.
-- Ejecutar en Neon (o la BD que use Render) después de desplegar el código nuevo.

-- 1. Ventas: al borrar usuario, borrar sus ventas (y detalles_venta por cascade)
ALTER TABLE ventas
  DROP CONSTRAINT IF EXISTS ventas_usuario_id_fkey;

ALTER TABLE ventas
  ADD CONSTRAINT ventas_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. Turnos: permitir created_by_id NULL y SET NULL al borrar usuario
ALTER TABLE turnos
  ALTER COLUMN created_by_id DROP NOT NULL;

ALTER TABLE turnos
  DROP CONSTRAINT IF EXISTS turnos_created_by_id_fkey;

ALTER TABLE turnos
  ADD CONSTRAINT turnos_created_by_id_fkey
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Sorteos: permitir realizado_por NULL y SET NULL al borrar usuario
ALTER TABLE sorteos
  ALTER COLUMN realizado_por DROP NOT NULL;

ALTER TABLE sorteos
  DROP CONSTRAINT IF EXISTS sorteos_realizado_por_fkey;

ALTER TABLE sorteos
  ADD CONSTRAINT sorteos_realizado_por_fkey
  FOREIGN KEY (realizado_por) REFERENCES users(id) ON DELETE SET NULL;
