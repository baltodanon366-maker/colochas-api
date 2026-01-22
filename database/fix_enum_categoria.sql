-- Script para verificar y corregir el enum categoria_turno
-- El problema es que Prisma busca "CategoriaTurno" pero PostgreSQL lo creó como "categoria_turno"

-- Verificar el nombre actual del enum
SELECT typname, typtype, oid 
FROM pg_type 
WHERE typname LIKE '%categoria%' OR typname LIKE '%Categoria%';

-- Si el enum se llama "categoria_turno" (minúsculas), necesitamos renombrarlo o crear un alias
-- O mejor aún, verificar que Prisma pueda encontrarlo

-- Opción 1: Renombrar el enum a CategoriaTurno (con mayúsculas)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_turno') THEN
        ALTER TYPE categoria_turno RENAME TO "CategoriaTurno";
        RAISE NOTICE 'Enum renombrado de categoria_turno a CategoriaTurno';
    ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CategoriaTurno') THEN
        RAISE NOTICE 'Enum CategoriaTurno ya existe';
    ELSE
        RAISE NOTICE 'No se encontró el enum categoria_turno';
    END IF;
END $$;

-- Verificar después del cambio
SELECT typname, typtype, oid 
FROM pg_type 
WHERE typname LIKE '%categoria%' OR typname LIKE '%Categoria%';

