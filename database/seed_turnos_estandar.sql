-- Script para crear los turnos estándar del sistema
-- Categoría: La Diaria y La Tica
-- IMPORTANTE: Ejecutar primero add_categoria_turno.sql para agregar el campo categoria

-- Obtener el ID del primer usuario admin (o usar ID 1 si no hay admin)
DO $$
DECLARE
    admin_id INTEGER;
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

    -- Turnos de La Diaria (solo insertar si no existen)
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '12 MD', 'diaria', '12:00', '14:00', 10, 5, 'Turno del mediodía - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '12 MD' AND categoria = 'diaria');
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '3 PM', 'diaria', '15:00', '17:00', 10, 5, 'Turno de las 3 PM - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '3 PM' AND categoria = 'diaria');
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '6 PM', 'diaria', '18:00', '20:00', 10, 5, 'Turno de las 6 PM - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '6 PM' AND categoria = 'diaria');
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '9 PM', 'diaria', '21:00', '23:00', 10, 5, 'Turno de las 9 PM - La Diaria', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '9 PM' AND categoria = 'diaria');

    -- Turnos de La Tica (solo insertar si no existen)
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '1 PM', 'tica', '13:00', '15:00', 10, 5, 'Turno de la 1 PM - La Tica', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '1 PM' AND categoria = 'tica');
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '4:30 PM', 'tica', '16:30', '18:30', 10, 5, 'Turno de las 4:30 PM - La Tica', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '4:30 PM' AND categoria = 'tica');
    
    INSERT INTO turnos (nombre, categoria, hora, hora_cierre, tiempo_alerta, tiempo_bloqueo, descripcion, estado, created_by_id, created_at, updated_at)
    SELECT '7:30 PM', 'tica', '19:30', '21:30', 10, 5, 'Turno de las 7:30 PM - La Tica', 'activo', admin_id, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE nombre = '7:30 PM' AND categoria = 'tica');

    RAISE NOTICE 'Turnos estándar creados con usuario ID: %', admin_id;
END $$;

