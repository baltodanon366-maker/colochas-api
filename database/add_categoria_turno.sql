-- Script para agregar el campo categoria a la tabla turnos
-- Ejecutar este script ANTES de ejecutar el seed de turnos

-- 1. Crear el tipo enum si no existe
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_turno') THEN
        CREATE TYPE categoria_turno AS ENUM ('diaria', 'tica');
    END IF;
END $$;

-- 2. Agregar la columna categoria a la tabla turnos
-- Si la columna ya existe, no hará nada
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'turnos' AND column_name = 'categoria'
    ) THEN
        ALTER TABLE turnos 
        ADD COLUMN categoria categoria_turno DEFAULT 'diaria' NOT NULL;
        
        -- Crear índices para mejorar el rendimiento
        CREATE INDEX IF NOT EXISTS idx_turnos_categoria ON turnos(categoria);
        CREATE INDEX IF NOT EXISTS idx_turnos_categoria_estado ON turnos(categoria, estado);
    END IF;
END $$;

-- 3. Comentario en la columna
COMMENT ON COLUMN turnos.categoria IS 'Categoría del turno: diaria o tica';

