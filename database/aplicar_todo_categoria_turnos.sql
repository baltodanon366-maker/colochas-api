-- Script completo para aplicar cambios de categoría de turnos
-- Este script combina la migración y el seed en uno solo
-- Ejecutar: psql -h localhost -p 5433 -U tu_usuario -d colochas_db -f database\aplicar_todo_categoria_turnos.sql

-- ============================================
-- PARTE 1: Agregar campo categoria
-- ============================================

-- 1. Crear el tipo enum si no existe
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_turno') THEN
        CREATE TYPE categoria_turno AS ENUM ('diaria', 'tica');
        RAISE NOTICE 'Enum categoria_turno creado';
    ELSE
        RAISE NOTICE 'Enum categoria_turno ya existe';
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
        
        RAISE NOTICE 'Columna categoria agregada a la tabla turnos';
    ELSE
        RAISE NOTICE 'Columna categoria ya existe en la tabla turnos';
    END IF;
END $$;

-- 3. Comentario en la columna
COMMENT ON COLUMN turnos.categoria IS 'Categoría del turno: diaria o tica';

-- ============================================
-- PARTE 2: Crear turnos estándar
-- ============================================

DO $$
DECLARE
    admin_id INTEGER;
    turnos_creados INTEGER := 0;
BEGIN
    -- Intentar obtener el ID del primer usuario admin
    SELECT id INTO admin_id 
    FROM users 
    WHERE id IN (
        SELECT ur.usuario_id 
        FROM usuario_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.nombre = 'admin'
    )
    LIMIT 1;
    
    -- Si no hay admin, usar el primer usuario activo
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM users WHERE estado = 'activo' LIMIT 1;
    END IF;
    
    -- Si aún no hay usuario, usar ID 1 (asumiendo que existe)
    IF admin_id IS NULL THEN
        admin_id := 1;
    END IF;

    RAISE NOTICE 'Usando usuario ID: % para crear turnos', admin_id;

    -- Turnos de La Diaria
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '12 MD', 'diaria', '12:00', '14:00', 10, 5, 'Turno del mediodía - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '12 MD' AND categoria = 'diaria');
    GET DIAGNOSTICS turnos_creados = ROW_COUNT;
    IF turnos_creados > 0 THEN RAISE NOTICE 'Turno 12 MD creado'; END IF;
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '3 PM', 'diaria', '15:00', '17:00', 10, 5, 'Turno de las 3 PM - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '3 PM' AND categoria = 'diaria');
    GET DIAGNOSTICS turnos_creados = ROW_COUNT;
    IF turnos_creados > 0 THEN RAISE NOTICE 'Turno 3 PM creado'; END IF;
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '6 PM', 'diaria', '18:00', '20:00', 10, 5, 'Turno de las 6 PM - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '6 PM' AND categoria = 'diaria');
    GET DIAGNOSTICS turnos_creados = ROW_COUNT;
    IF turnos_creados > 0 THEN RAISE NOTICE 'Turno 6 PM creado'; END IF;
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '9 PM', 'diaria', '21:00', '23:00', 10, 5, 'Turno de las 9 PM - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '9 PM' AND categoria = 'diaria');
    GET DIAGNOSTICS turnos_creados = ROW_COUNT;
    IF turnos_creados > 0 THEN RAISE NOTICE 'Turno 9 PM creado'; END IF;

    -- Turnos de La Tica
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '1 PM', 'tica', '13:00', '15:00', 10, 5, 'Turno de la 1 PM - La Tica', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '1 PM' AND categoria = 'tica');
    GET DIAGNOSTICS turnos_creados = ROW_COUNT;
    IF turnos_creados > 0 THEN RAISE NOTICE 'Turno 1 PM creado'; END IF;
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '4:30 PM', 'tica', '16:30', '18:30', 10, 5, 'Turno de las 4:30 PM - La Tica', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '4:30 PM' AND categoria = 'tica');
    GET DIAGNOSTICS turnos_creados = ROW_COUNT;
    IF turnos_creados > 0 THEN RAISE NOTICE 'Turno 4:30 PM creado'; END IF;
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '7:30 PM', 'tica', '19:30', '21:30', 10, 5, 'Turno de las 7:30 PM - La Tica', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '7:30 PM' AND categoria = 'tica');
    GET DIAGNOSTICS turnos_creados = ROW_COUNT;
    IF turnos_creados > 0 THEN RAISE NOTICE 'Turno 7:30 PM creado'; END IF;

    RAISE NOTICE 'Proceso completado. Verifica los turnos con: SELECT * FROM turnos ORDER BY categoria, hora;';
END $$;

-- Mostrar resumen
SELECT 
    categoria,
    COUNT(*) as total_turnos,
    STRING_AGG(nombre, ', ' ORDER BY hora) as turnos
FROM turnos
WHERE estado = 'activo'
GROUP BY categoria
ORDER BY categoria;
