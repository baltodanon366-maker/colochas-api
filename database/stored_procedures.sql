-- ============================================
-- PROCEDIMIENTOS ALMACENADOS
-- Sistema de Control de Rifas
-- PostgreSQL
-- ============================================

-- ============================================
-- CREAR TIPOS ENUM SI NO EXISTEN
-- ============================================

-- Crear tipo estado_general si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_general') THEN
        CREATE TYPE estado_general AS ENUM ('activo', 'inactivo');
    END IF;
END $$;

-- Crear tipo tipo_alerta si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alerta') THEN
        CREATE TYPE tipo_alerta AS ENUM ('restriccion_numero', 'cierre_turno', 'bloqueo_ventas');
    END IF;
END $$;

-- Crear tipo estado_alerta si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_alerta') THEN
        CREATE TYPE estado_alerta AS ENUM ('activa', 'vista', 'resuelta');
    END IF;
END $$;

-- ============================================
-- 1. GENERAR NÚMERO DE BOUCHER (formato: B-000013, sin año)
-- ============================================
CREATE OR REPLACE FUNCTION generar_numero_boucher()
RETURNS VARCHAR(50) AS $$
DECLARE
    siguiente_numero INTEGER;
    v_numero_boucher VARCHAR(50);
BEGIN
    -- Obtener la mayor secuencia de 6 dígitos al final de cualquier numero_boucher existente
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(ventas.numero_boucher FROM '[0-9]+$') AS INTEGER)),
        0
    ) + 1 INTO siguiente_numero
    FROM ventas;
    
    -- Formato: B-NNNNNN (ej. B-000013)
    v_numero_boucher := 'B-' || LPAD(siguiente_numero::TEXT, 6, '0');
    
    RETURN v_numero_boucher;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. VERIFICAR RESTRICCIÓN DE NÚMERO
-- ============================================
-- Esta función verifica si un número está completamente restringido
-- Para verificar límites de monto, usar verificar_restriccion_numero_con_monto
CREATE OR REPLACE FUNCTION verificar_restriccion_numero(
    p_turno_id INTEGER,
    p_numero INTEGER,
    p_fecha DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_esta_restringido BOOLEAN;
    v_tipo_restriccion VARCHAR(20);
BEGIN
    SELECT esta_restringido, tipo_restriccion INTO v_esta_restringido, v_tipo_restriccion
    FROM restricciones_numeros
    WHERE turno_id = p_turno_id
      AND numero = p_numero
      AND fecha = p_fecha;
    
    -- Si no existe registro, no está restringido
    IF v_esta_restringido IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Si el tipo es "completo", está completamente restringido
    IF v_tipo_restriccion = 'completo' THEN
        RETURN v_esta_restringido;
    END IF;
    
    -- Para "monto" y "cantidad", no está completamente restringido
    -- (se valida con la función específica)
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2.1. VERIFICAR RESTRICCIÓN DE NÚMERO CON MONTO
-- ============================================
-- Esta función verifica si un número está restringido considerando el monto
-- Retorna TRUE si está restringido (completo o monto excedido)
CREATE OR REPLACE FUNCTION verificar_restriccion_numero_con_monto(
    p_turno_id INTEGER,
    p_numero INTEGER,
    p_fecha DATE,
    p_monto DECIMAL
)
RETURNS JSONB AS $$
DECLARE
    v_restriccion RECORD;
    v_resultado JSONB;
BEGIN
    SELECT 
        esta_restringido,
        tipo_restriccion,
        limite_monto,
        limite_cantidad
    INTO v_restriccion
    FROM restricciones_numeros
    WHERE turno_id = p_turno_id
      AND numero = p_numero
      AND fecha = p_fecha;
    
    -- Si no existe registro, no está restringido
    IF v_restriccion.esta_restringido IS NULL THEN
        RETURN jsonb_build_object(
            'esta_restringido', FALSE,
            'mensaje', ''
        );
    END IF;
    
    -- Si el tipo es "completo", está completamente restringido
    IF v_restriccion.tipo_restriccion = 'completo' THEN
        RETURN jsonb_build_object(
            'esta_restringido', TRUE,
            'mensaje', 'El número ' || p_numero || ' está completamente restringido'
        );
    END IF;
    
    -- Si el tipo es "monto", verificar si el monto excede el límite
    IF v_restriccion.tipo_restriccion = 'monto' THEN
        IF p_monto > v_restriccion.limite_monto THEN
            RETURN jsonb_build_object(
                'esta_restringido', TRUE,
                'mensaje', 'El número ' || p_numero || ' tiene un límite de ' || 
                          v_restriccion.limite_monto || ' córdobas. El monto solicitado (' || 
                          p_monto || ') excede el límite'
            );
        ELSE
            RETURN jsonb_build_object(
                'esta_restringido', FALSE,
                'mensaje', ''
            );
        END IF;
    END IF;
    
    -- Si el tipo es "cantidad", no se valida aquí (se valida en el servicio)
    -- Por ahora, retornar que no está restringido
    RETURN jsonb_build_object(
        'esta_restringido', FALSE,
        'mensaje', ''
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. ACTUALIZAR CONTADOR DE RESTRICCIÓN (OBSOLETA)
--    Esta función ya no se usa porque el modelo actual de restricciones
--    es binario (restringido/no restringido) y se maneja manualmente.
--    Se mantiene como stub por compatibilidad, pero no hace nada.
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_contador_restriccion(
    p_turno_id INTEGER,
    p_numero INTEGER,
    p_fecha DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Esta función ya no es necesaria con el nuevo modelo de restricciones
    -- Las restricciones ahora son solo binarias (restringido/no restringido)
    -- y se manejan manualmente a través de la API
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREAR VENTA (Proceso completo)
-- ============================================
CREATE OR REPLACE FUNCTION crear_venta(
    p_turno_id INTEGER,
    p_usuario_id INTEGER,
    p_fecha DATE,
    p_detalles JSONB, -- Array de {numero: int, monto: decimal}
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_numero_boucher VARCHAR(50);
    v_venta_id INTEGER;
    v_total DECIMAL(10, 2) := 0;
    v_detalle JSONB;
    v_numero INTEGER;
    v_monto DECIMAL(10, 2);
    v_esta_restringido BOOLEAN;
    v_resultado JSONB;
    v_errores TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Validar que el turno esté activo
    IF NOT EXISTS (SELECT 1 FROM turnos WHERE id = p_turno_id AND estado = 'activo') THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'El turno no existe o está inactivo'
        );
    END IF;
    
    -- Validar que el usuario esté activo
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_usuario_id AND estado = 'activo') THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'El usuario no existe o está inactivo'
        );
    END IF;
    
    -- Validar restricciones de números
    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        v_numero := (v_detalle->>'numero')::INTEGER;
        v_monto := (v_detalle->>'monto')::DECIMAL;
        
        -- Verificar restricción con monto (considera límites)
        v_resultado := verificar_restriccion_numero_con_monto(
            p_turno_id, 
            v_numero, 
            p_fecha, 
            v_monto
        );
        
        IF (v_resultado->>'esta_restringido')::BOOLEAN THEN
            v_errores := array_append(v_errores, v_resultado->>'mensaje');
        END IF;
        
        v_total := v_total + v_monto;
    END LOOP;
    
    -- Si hay errores, retornar
    IF array_length(v_errores, 1) > 0 THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'errores', v_errores
        );
    END IF;
    
    -- Generar número de boucher (formato B-000013)
    v_numero_boucher := generar_numero_boucher();
    
    -- Crear venta
    INSERT INTO ventas (
        numero_boucher, turno_id, fecha, fecha_hora, usuario_id, total, observaciones, created_at, updated_at
    ) VALUES (
        v_numero_boucher, p_turno_id, p_fecha, NOW(), p_usuario_id, v_total, p_observaciones, NOW(), NOW()
    ) RETURNING id INTO v_venta_id;
    
    -- Crear detalles de venta
    -- NOTA: Ya no actualizamos contadores de restricción porque el modelo actual
    -- es binario (restringido/no restringido) y se maneja manualmente
    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        v_numero := (v_detalle->>'numero')::INTEGER;
        v_monto := (v_detalle->>'monto')::DECIMAL;
        
        -- Insertar detalle
        INSERT INTO detalles_venta (venta_id, numero, monto)
        VALUES (v_venta_id, v_numero, v_monto);
    END LOOP;
    
    -- Retornar resultado
    RETURN jsonb_build_object(
        'exito', TRUE,
        'venta_id', v_venta_id,
        'numero_boucher', v_numero_boucher,
        'total', v_total
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CERRAR TURNO (Marca turno como cerrado)
-- ============================================
CREATE OR REPLACE FUNCTION cerrar_turno(
    p_turno_id INTEGER,
    p_fecha DATE,
    p_cerrado_por INTEGER,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cierre_id INTEGER;
    v_total_ventas INTEGER;
    v_total_monto DECIMAL(12, 2);
    v_turno_nombre VARCHAR(100);
BEGIN
    -- Verificar que el turno existe
    SELECT nombre INTO v_turno_nombre
    FROM turnos
    WHERE id = p_turno_id AND estado = 'activo';
    
    IF v_turno_nombre IS NULL THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Turno no encontrado o inactivo'
        );
    END IF;
    
    -- Verificar que no esté ya cerrado
    IF EXISTS (
        SELECT 1 FROM cierres_turno 
        WHERE turno_id = p_turno_id AND fecha = p_fecha
    ) THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'El turno ya está cerrado'
        );
    END IF;
    
    -- Calcular totales de ventas
    SELECT 
        COUNT(*),
        COALESCE(SUM(total), 0)
    INTO v_total_ventas, v_total_monto
    FROM ventas
    WHERE turno_id = p_turno_id
      AND fecha = p_fecha;
    
    -- Crear registro de cierre
    INSERT INTO cierres_turno (turno_id, fecha, cerrado_por, observaciones)
    VALUES (p_turno_id, p_fecha, p_cerrado_por, p_observaciones)
    RETURNING id INTO v_cierre_id;
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'cierre_id', v_cierre_id,
        'turno_id', p_turno_id,
        'turno_nombre', v_turno_nombre,
        'fecha', p_fecha,
        'total_ventas', COALESCE(v_total_ventas, 0),
        'total_monto', COALESCE(v_total_monto, 0),
        'cerrado_en', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. OBTENER CIERRE DE TURNO (Consulta de ventas agrupadas)
-- ============================================
CREATE OR REPLACE FUNCTION obtener_cierre_turno(
    p_turno_id INTEGER,
    p_fecha DATE
)
RETURNS JSONB AS $$
DECLARE
    v_resultado JSONB;
    v_total_ventas INTEGER;
    v_total_monto DECIMAL(12, 2);
    v_primera_venta TIMESTAMP;
    v_ultima_venta TIMESTAMP;
    v_turno_nombre VARCHAR(100);
    v_esta_cerrado BOOLEAN;
    v_cerrado_en TIMESTAMP;
BEGIN
    -- Verificar que el turno existe
    SELECT nombre INTO v_turno_nombre
    FROM turnos
    WHERE id = p_turno_id AND estado = 'activo';
    
    IF v_turno_nombre IS NULL THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Turno no encontrado o inactivo'
        );
    END IF;
    
    -- Verificar si está cerrado
    SELECT EXISTS(
        SELECT 1 FROM cierres_turno 
        WHERE turno_id = p_turno_id AND fecha = p_fecha
    ), MAX(cerrado_en) INTO v_esta_cerrado, v_cerrado_en
    FROM cierres_turno
    WHERE turno_id = p_turno_id AND fecha = p_fecha;
    
    -- Calcular totales
    SELECT 
        COUNT(*),
        COALESCE(SUM(total), 0),
        MIN(fecha_hora),
        MAX(fecha_hora)
    INTO v_total_ventas, v_total_monto, v_primera_venta, v_ultima_venta
    FROM ventas
    WHERE turno_id = p_turno_id
      AND fecha = p_fecha;
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'turno_id', p_turno_id,
        'turno_nombre', v_turno_nombre,
        'fecha', p_fecha,
        'esta_cerrado', COALESCE(v_esta_cerrado, FALSE),
        'cerrado_en', v_cerrado_en,
        'total_ventas', COALESCE(v_total_ventas, 0),
        'total_monto', COALESCE(v_total_monto, 0),
        'primera_venta', v_primera_venta,
        'ultima_venta', v_ultima_venta
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. BUSCAR BOUCHER POR NÚMERO
-- ============================================
CREATE OR REPLACE FUNCTION buscar_boucher(
    p_numero_boucher VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
    v_resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', v.id,
        'numero_boucher', v.numero_boucher,
        'fecha', v.fecha,
        'fecha_hora', v.fecha_hora,
        'total', v.total,
        'observaciones', v.observaciones,
        'vendedor', jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'telefono', u.telefono
        ),
        'turno', jsonb_build_object(
            'id', t.id,
            'nombre', t.nombre
        ),
        'detalles', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'numero', dv.numero,
                    'monto', dv.monto
                )
            )
            FROM detalles_venta dv
            WHERE dv.venta_id = v.id
        )
    ) INTO v_resultado
    FROM ventas v
    JOIN users u ON v.usuario_id = u.id
    JOIN turnos t ON v.turno_id = t.id
    WHERE v.numero_boucher = p_numero_boucher;
    
    IF v_resultado IS NULL THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Boucher no encontrado'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'data', v_resultado
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. VERIFICAR PERMISOS DE USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION verificar_permiso(
    p_usuario_id INTEGER,
    p_permiso_nombre VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tiene_permiso BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM usuario_roles ur
        JOIN role_permisos rp ON ur.role_id = rp.role_id
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE ur.usuario_id = p_usuario_id
          AND p.nombre = p_permiso_nombre
          AND p.estado = 'activo'
          AND EXISTS(
              SELECT 1 FROM roles r 
              WHERE r.id = ur.role_id 
                AND r.estado = 'activo'
          )
    ) INTO v_tiene_permiso;
    
    RETURN COALESCE(v_tiene_permiso, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. OBTENER KPIS - NÚMERO MÁS VENDIDO
-- ============================================
CREATE OR REPLACE FUNCTION obtener_numero_mas_vendido(
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS JSONB AS $$
DECLARE
    v_resultado JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'numero', numero,
            'veces_vendido', veces_vendido,
            'total_monto', total_monto
        ) ORDER BY veces_vendido DESC
    ) INTO v_resultado
    FROM (
        SELECT 
            dv.numero,
            COUNT(*) as veces_vendido,
            SUM(dv.monto) as total_monto
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        WHERE v.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY dv.numero
        ORDER BY veces_vendido DESC
        LIMIT 10
    ) subquery;
    
    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. OBTENER KPIS - NÚMERO MÁS VECES GANADOR
-- ============================================
CREATE OR REPLACE FUNCTION obtener_numero_mas_veces_ganador(
    p_fecha DATE
)
RETURNS JSONB AS $$
DECLARE
    v_resultado JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'numero', numero_ganador,
            'veces_ganador', veces_ganador
        ) ORDER BY veces_ganador DESC
    ) INTO v_resultado
    FROM (
        SELECT 
            numero_ganador,
            COUNT(*) as veces_ganador
        FROM sorteos
        WHERE fecha = p_fecha
        GROUP BY numero_ganador
        ORDER BY veces_ganador DESC
    ) subquery;
    
    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. OBTENER KPIS - EMPLEADO CON MÁS VENTAS
-- ============================================
CREATE OR REPLACE FUNCTION obtener_empleado_mas_ventas(
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS JSONB AS $$
DECLARE
    v_resultado JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'usuario_id', usuario_id,
            'name', name,
            'telefono', telefono,
            'total_ventas', total_ventas,
            'total_monto', total_monto
        ) ORDER BY total_ventas DESC
    ) INTO v_resultado
    FROM (
        SELECT 
            u.id as usuario_id,
            u.name,
            u.telefono,
            COUNT(v.id) as total_ventas,
            SUM(v.total) as total_monto
        FROM users u
        JOIN ventas v ON u.id = v.usuario_id
        WHERE v.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY u.id, u.name, u.telefono
        ORDER BY total_ventas DESC
        LIMIT 10
    ) subquery;
    
    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. VERIFICAR ALERTAS DE CIERRE DE TURNO
-- ============================================
CREATE OR REPLACE FUNCTION verificar_alerta_cierre_turno(
    p_turno_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_hora_cierre VARCHAR(10);
    v_tiempo_alerta INTEGER;
    v_tiempo_bloqueo INTEGER;
    v_hora_actual TIME;
    v_minutos_restantes INTEGER;
    v_estado VARCHAR(20);
BEGIN
    -- Obtener configuración del turno
    SELECT hora_cierre, tiempo_alerta, tiempo_bloqueo
    INTO v_hora_cierre, v_tiempo_alerta, v_tiempo_bloqueo
    FROM turnos
    WHERE id = p_turno_id AND estado = 'activo';
    
    IF v_hora_cierre IS NULL THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Turno no encontrado o inactivo'
        );
    END IF;
    
    v_hora_actual := CURRENT_TIME;
    v_minutos_restantes := EXTRACT(EPOCH FROM (v_hora_cierre::TIME - v_hora_actual)) / 60;
    
    -- Determinar estado
    IF v_minutos_restantes <= 0 THEN
        v_estado := 'cerrado';
    ELSIF v_minutos_restantes <= v_tiempo_bloqueo THEN
        v_estado := 'bloqueado';
    ELSIF v_minutos_restantes <= v_tiempo_alerta THEN
        v_estado := 'alerta';
    ELSE
        v_estado := 'activo';
    END IF;
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'estado', v_estado,
        'minutos_restantes', v_minutos_restantes,
        'hora_cierre', v_hora_cierre,
        'puede_vender', v_estado = 'activo' OR v_estado = 'alerta'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. CREAR ALERTA DE RESTRICCIÓN
-- ============================================
CREATE OR REPLACE FUNCTION crear_alerta_restriccion(
    p_turno_id INTEGER,
    p_numero INTEGER,
    p_fecha DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_alerta_id INTEGER;
    v_usuarios INTEGER[];
BEGIN
    -- Obtener todos los usuarios activos
    SELECT ARRAY_AGG(id) INTO v_usuarios
    FROM users
    WHERE estado = 'activo';
    
    -- Crear alerta para cada usuario
    FOREACH v_alerta_id IN ARRAY v_usuarios
    LOOP
        INSERT INTO alertas (
            usuario_id, tipo, titulo, mensaje, numero, turno_id, estado
        ) VALUES (
            v_alerta_id,
            'restriccion_numero',
            'Número Restringido',
            'El número ' || p_numero || ' ha alcanzado su límite y está restringido',
            p_numero,
            p_turno_id,
            'activa'
        );
    END LOOP;
    
    RETURN array_length(v_usuarios, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. OBTENER VENTAS POR TURNO (Para mostrar al hacer click en turno)
-- ============================================
CREATE OR REPLACE FUNCTION obtener_ventas_por_turno(
    p_turno_id INTEGER,
    p_fecha DATE,
    p_usuario_id INTEGER DEFAULT NULL, -- NULL = admin ve todas, INTEGER = vendedor ve solo suyas
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
    v_offset INTEGER;
    v_total INTEGER;
    v_resultado JSONB;
    v_turno_nombre VARCHAR(100);
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    -- Verificar que el turno existe
    SELECT nombre INTO v_turno_nombre
    FROM turnos
    WHERE id = p_turno_id AND estado = 'activo';
    
    IF v_turno_nombre IS NULL THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Turno no encontrado o inactivo'
        );
    END IF;
    
    -- Contar total
    SELECT COUNT(*) INTO v_total
    FROM ventas v
    WHERE v.turno_id = p_turno_id
      AND v.fecha = p_fecha
      AND (p_usuario_id IS NULL OR v.usuario_id = p_usuario_id);
    
    -- Obtener datos
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', v.id,
            'numero_boucher', v.numero_boucher,
            'fecha_hora', v.fecha_hora,
            'total', v.total,
            'observaciones', v.observaciones,
            'vendedor', jsonb_build_object(
                'id', u.id,
                'name', u.name,
                'telefono', u.telefono
            ),
            'detalles', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'numero', dv.numero,
                        'monto', dv.monto
                    )
                )
                FROM detalles_venta dv
                WHERE dv.venta_id = v.id
            )
        ) ORDER BY v.fecha_hora DESC
    ) INTO v_resultado
    FROM ventas v
    JOIN users u ON v.usuario_id = u.id
    WHERE v.turno_id = p_turno_id
      AND v.fecha = p_fecha
      AND (p_usuario_id IS NULL OR v.usuario_id = p_usuario_id)
    ORDER BY v.fecha_hora DESC
    LIMIT p_limit OFFSET v_offset;
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'turno', jsonb_build_object(
            'id', p_turno_id,
            'nombre', v_turno_nombre,
            'fecha', p_fecha
        ),
        'data', COALESCE(v_resultado, '[]'::jsonb),
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total,
            'total_pages', CEIL(v_total::DECIMAL / p_limit)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 15. OBTENER HISTORIAL DE VENTAS (Con paginación)
-- ============================================
CREATE OR REPLACE FUNCTION obtener_historial_ventas(
    p_usuario_id INTEGER DEFAULT NULL, -- NULL = admin (todas), INTEGER = vendedor (solo suyas)
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin DATE DEFAULT NULL,
    p_turno_id INTEGER DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
    v_offset INTEGER;
    v_total INTEGER;
    v_resultado JSONB;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    -- Contar total
    SELECT COUNT(*) INTO v_total
    FROM ventas v
    WHERE (p_usuario_id IS NULL OR v.usuario_id = p_usuario_id)
      AND (p_fecha_inicio IS NULL OR v.fecha >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR v.fecha <= p_fecha_fin)
      AND (p_turno_id IS NULL OR v.turno_id = p_turno_id);
    
    -- Obtener datos
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', v.id,
            'numero_boucher', v.numero_boucher,
            'fecha', v.fecha,
            'fecha_hora', v.fecha_hora,
            'total', v.total,
            'vendedor', jsonb_build_object(
                'id', u.id,
                'name', u.name
            ),
            'turno', jsonb_build_object(
                'id', t.id,
                'nombre', t.nombre
            )
        ) ORDER BY v.fecha_hora DESC
    ) INTO v_resultado
    FROM (
        SELECT v.id, v.numero_boucher, v.fecha, v.fecha_hora, v.total, v.usuario_id, v.turno_id
        FROM ventas v
        WHERE (p_usuario_id IS NULL OR v.usuario_id = p_usuario_id)
          AND (p_fecha_inicio IS NULL OR v.fecha >= p_fecha_inicio)
          AND (p_fecha_fin IS NULL OR v.fecha <= p_fecha_fin)
          AND (p_turno_id IS NULL OR v.turno_id = p_turno_id)
        ORDER BY v.fecha_hora DESC
        LIMIT p_limit OFFSET v_offset
    ) v
    JOIN users u ON v.usuario_id = u.id
    JOIN turnos t ON v.turno_id = t.id;
    
    RETURN jsonb_build_object(
        'data', COALESCE(v_resultado, '[]'::jsonb),
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total,
            'total_pages', CEIL(v_total::DECIMAL / p_limit)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. REGISTRAR USUARIO (Solo admin puede crear) - name + telefono 8 dígitos
-- ============================================
CREATE OR REPLACE FUNCTION registrar_usuario(
    p_name VARCHAR(100),
    p_telefono VARCHAR(8),
    p_created_by_id INTEGER,
    p_role_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]
)
RETURNS JSONB AS $$
DECLARE
    v_usuario_id INTEGER;
    v_role_id INTEGER;
    v_permiso_crear BOOLEAN;
BEGIN
    -- Verificar que el usuario creador tiene permiso
    v_permiso_crear := verificar_permiso(p_created_by_id, 'crear_usuario');
    
    IF NOT v_permiso_crear THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No tiene permiso para crear usuarios'
        );
    END IF;
    
    -- Verificar que el teléfono no existe
    IF EXISTS (SELECT 1 FROM users WHERE telefono = p_telefono) THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'El teléfono ya está registrado'
        );
    END IF;
    
    -- Crear usuario
    INSERT INTO users (name, telefono, estado, created_by_id, created_at, updated_at)
    VALUES (p_name, p_telefono, 'activo', p_created_by_id, NOW(), NOW())
    RETURNING id INTO v_usuario_id;
    
    -- Asignar roles si se proporcionaron
    IF array_length(p_role_ids, 1) > 0 THEN
        FOREACH v_role_id IN ARRAY p_role_ids
        LOOP
            -- Verificar que el rol existe y está activo
            IF EXISTS (SELECT 1 FROM roles WHERE id = v_role_id AND estado = 'activo') THEN
                INSERT INTO usuario_roles (usuario_id, role_id, asignado_por, created_at, updated_at)
                VALUES (v_usuario_id, v_role_id, p_created_by_id, NOW(), NOW())
                ON CONFLICT (usuario_id, role_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id)
    VALUES (p_created_by_id, 'crear_usuario', 'usuario', v_usuario_id);
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'usuario_id', v_usuario_id,
        'message', 'Usuario creado exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 17. LOGIN (solo teléfono 8 dígitos)
-- ============================================
CREATE OR REPLACE FUNCTION login_usuario(
    p_telefono VARCHAR(8)
)
RETURNS JSONB AS $$
DECLARE
    v_usuario_id INTEGER;
    v_name VARCHAR(100);
    v_telefono VARCHAR(8);
    v_estado estado_general;
    v_last_login TIMESTAMP;
    v_roles JSONB;
BEGIN
    -- Buscar usuario por teléfono
    SELECT id, name, telefono, estado, last_login
    INTO v_usuario_id, v_name, v_telefono, v_estado, v_last_login
    FROM users
    WHERE telefono = p_telefono;
    
    -- Verificar que el usuario existe
    IF v_usuario_id IS NULL THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Credenciales inválidas'
        );
    END IF;
    
    -- Verificar que el usuario está activo
    IF v_estado != 'activo' THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Usuario inactivo'
        );
    END IF;
    
    -- Actualizar last_login
    UPDATE users
    SET last_login = NOW()
    WHERE id = v_usuario_id;
    
    -- Obtener roles del usuario
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'nombre', r.nombre,
            'descripcion', r.descripcion
        )
    ) INTO v_roles
    FROM usuario_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.usuario_id = v_usuario_id
      AND r.estado = 'activo';
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id)
    VALUES (v_usuario_id, 'login', 'usuario', v_usuario_id);
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'usuario', jsonb_build_object(
            'id', v_usuario_id,
            'name', v_name,
            'telefono', v_telefono,
            'last_login', v_last_login
        ),
        'roles', COALESCE(v_roles, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. OBTENER PERMISOS DE USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION obtener_permisos_usuario(
    p_usuario_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permisos JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'nombre', p.nombre,
            'descripcion', p.descripcion,
            'modulo', p.modulo
        )
    ) INTO v_permisos
    FROM usuario_roles ur
    JOIN role_permisos rp ON ur.role_id = rp.role_id
    JOIN permisos p ON rp.permiso_id = p.id
    WHERE ur.usuario_id = p_usuario_id
      AND p.estado = 'activo'
      AND EXISTS(
          SELECT 1 FROM roles r 
          WHERE r.id = ur.role_id 
            AND r.estado = 'activo'
      )
    GROUP BY p.id, p.nombre, p.descripcion, p.modulo;
    
    RETURN COALESCE(v_permisos, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 17. ASIGNAR ROL A USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION asignar_rol_usuario(
    p_usuario_id INTEGER,
    p_role_id INTEGER,
    p_asignado_por INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permiso_asignar BOOLEAN;
    v_role_nombre VARCHAR(50);
    v_usuario_name VARCHAR(100);
BEGIN
    -- Verificar permiso
    v_permiso_asignar := verificar_permiso(p_asignado_por, 'editar_usuario');
    
    IF NOT v_permiso_asignar THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No tiene permiso para asignar roles'
        );
    END IF;
    
    -- Verificar que el usuario existe y está activo
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_usuario_id AND estado = 'activo') THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Usuario no existe o está inactivo'
        );
    END IF;
    
    -- Verificar que el rol existe y está activo
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id AND estado = 'activo') THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Rol no existe o está inactivo'
        );
    END IF;
    
    -- Asignar rol
    INSERT INTO usuario_roles (usuario_id, role_id, asignado_por, created_at, updated_at)
    VALUES (p_usuario_id, p_role_id, p_asignado_por, NOW(), NOW())
    ON CONFLICT (usuario_id, role_id) DO UPDATE
    SET asignado_por = p_asignado_por,
        updated_at = NOW();
    
    -- Obtener nombres para auditoría
    SELECT nombre INTO v_role_nombre FROM roles WHERE id = p_role_id;
    SELECT name INTO v_usuario_name FROM users WHERE id = p_usuario_id;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles)
    VALUES (
        p_asignado_por,
        'asignar_rol',
        'usuario',
        p_usuario_id,
        jsonb_build_object(
            'usuario', v_usuario_name,
            'rol', v_role_nombre
        )
    );
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'message', 'Rol asignado exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 18. REMOVER ROL DE USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION remover_rol_usuario(
    p_usuario_id INTEGER,
    p_role_id INTEGER,
    p_removido_por INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permiso_remover BOOLEAN;
    v_role_nombre VARCHAR(50);
    v_usuario_name VARCHAR(100);
BEGIN
    -- Verificar permiso
    v_permiso_remover := verificar_permiso(p_removido_por, 'editar_usuario');
    
    IF NOT v_permiso_remover THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No tiene permiso para remover roles'
        );
    END IF;
    
    -- Verificar que la asignación existe
    IF NOT EXISTS (
        SELECT 1 FROM usuario_roles 
        WHERE usuario_id = p_usuario_id AND role_id = p_role_id
    ) THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'El usuario no tiene este rol asignado'
        );
    END IF;
    
    -- Obtener nombres para auditoría
    SELECT nombre INTO v_role_nombre FROM roles WHERE id = p_role_id;
    SELECT name INTO v_usuario_name FROM users WHERE id = p_usuario_id;
    
    -- Remover rol
    DELETE FROM usuario_roles
    WHERE usuario_id = p_usuario_id AND role_id = p_role_id;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles)
    VALUES (
        p_removido_por,
        'remover_rol',
        'usuario',
        p_usuario_id,
        jsonb_build_object(
            'usuario', v_usuario_name,
            'rol', v_role_nombre
        )
    );
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'message', 'Rol removido exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 19. ASIGNAR PERMISO A ROL
-- ============================================
CREATE OR REPLACE FUNCTION asignar_permiso_rol(
    p_role_id INTEGER,
    p_permiso_id INTEGER,
    p_asignado_por INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permiso_asignar BOOLEAN;
    v_permiso_nombre VARCHAR(100);
    v_role_nombre VARCHAR(50);
BEGIN
    -- Verificar permiso (solo admin puede asignar permisos a roles)
    v_permiso_asignar := verificar_permiso(p_asignado_por, 'editar_configuracion');
    
    IF NOT v_permiso_asignar THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No tiene permiso para asignar permisos a roles'
        );
    END IF;
    
    -- Verificar que el rol existe y está activo
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id AND estado = 'activo') THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Rol no existe o está inactivo'
        );
    END IF;
    
    -- Verificar que el permiso existe y está activo
    IF NOT EXISTS (SELECT 1 FROM permisos WHERE id = p_permiso_id AND estado = 'activo') THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Permiso no existe o está inactivo'
        );
    END IF;
    
    -- Asignar permiso
    INSERT INTO role_permisos (role_id, permiso_id)
    VALUES (p_role_id, p_permiso_id)
    ON CONFLICT (role_id, permiso_id) DO NOTHING;
    
    -- Obtener nombres para auditoría
    SELECT nombre INTO v_permiso_nombre FROM permisos WHERE id = p_permiso_id;
    SELECT nombre INTO v_role_nombre FROM roles WHERE id = p_role_id;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles)
    VALUES (
        p_asignado_por,
        'asignar_permiso_rol',
        'role',
        p_role_id,
        jsonb_build_object(
            'rol', v_role_nombre,
            'permiso', v_permiso_nombre
        )
    );
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'message', 'Permiso asignado al rol exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 20. REMOVER PERMISO DE ROL
-- ============================================
CREATE OR REPLACE FUNCTION remover_permiso_rol(
    p_role_id INTEGER,
    p_permiso_id INTEGER,
    p_removido_por INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permiso_remover BOOLEAN;
    v_permiso_nombre VARCHAR(100);
    v_role_nombre VARCHAR(50);
BEGIN
    -- Verificar permiso
    v_permiso_remover := verificar_permiso(p_removido_por, 'editar_configuracion');
    
    IF NOT v_permiso_remover THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No tiene permiso para remover permisos de roles'
        );
    END IF;
    
    -- Verificar que la asignación existe
    IF NOT EXISTS (
        SELECT 1 FROM role_permisos 
        WHERE role_id = p_role_id AND permiso_id = p_permiso_id
    ) THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'El rol no tiene este permiso asignado'
        );
    END IF;
    
    -- Obtener nombres para auditoría
    SELECT nombre INTO v_permiso_nombre FROM permisos WHERE id = p_permiso_id;
    SELECT nombre INTO v_role_nombre FROM roles WHERE id = p_role_id;
    
    -- Remover permiso
    DELETE FROM role_permisos
    WHERE role_id = p_role_id AND permiso_id = p_permiso_id;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles)
    VALUES (
        p_removido_por,
        'remover_permiso_rol',
        'role',
        p_role_id,
        jsonb_build_object(
            'rol', v_role_nombre,
            'permiso', v_permiso_nombre
        )
    );
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'message', 'Permiso removido del rol exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 21. ACTUALIZAR CONTRASEÑA
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_password(
    p_usuario_id INTEGER,
    p_password_hash_actual TEXT,
    p_password_hash_nuevo TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_password_hash_actual TEXT;
BEGIN
    -- Obtener contraseña actual
    SELECT password_hash INTO v_password_hash_actual
    FROM users
    WHERE id = p_usuario_id AND estado = 'activo';
    
    -- Verificar que el usuario existe
    IF v_password_hash_actual IS NULL THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Usuario no encontrado o inactivo'
        );
    END IF;
    
    -- Verificar contraseña actual
    IF v_password_hash_actual != p_password_hash_actual THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Contraseña actual incorrecta'
        );
    END IF;
    
    -- Actualizar contraseña
    UPDATE users
    SET password_hash = p_password_hash_nuevo,
        updated_at = NOW()
    WHERE id = p_usuario_id;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id)
    VALUES (p_usuario_id, 'actualizar_password', 'usuario', p_usuario_id);
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'message', 'Contraseña actualizada exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 22. DESACTIVAR USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION desactivar_usuario(
    p_usuario_id INTEGER,
    p_desactivado_por INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permiso_desactivar BOOLEAN;
    v_usuario_name VARCHAR(100);
BEGIN
    -- Verificar permiso
    v_permiso_desactivar := verificar_permiso(p_desactivado_por, 'editar_usuario');
    
    IF NOT v_permiso_desactivar THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No tiene permiso para desactivar usuarios'
        );
    END IF;
    
    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_usuario_id) THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- No permitir desactivarse a sí mismo
    IF p_usuario_id = p_desactivado_por THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No puede desactivar su propio usuario'
        );
    END IF;
    
    -- Obtener nombre para auditoría
    SELECT name INTO v_usuario_name FROM users WHERE id = p_usuario_id;
    
    -- Desactivar usuario
    UPDATE users
    SET estado = 'inactivo',
        updated_at = NOW()
    WHERE id = p_usuario_id;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles)
    VALUES (
        p_desactivado_por,
        'desactivar_usuario',
        'usuario',
        p_usuario_id,
        jsonb_build_object('usuario', v_usuario_name)
    );
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'message', 'Usuario desactivado exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 23. ACTIVAR USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION activar_usuario(
    p_usuario_id INTEGER,
    p_activado_por INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permiso_activar BOOLEAN;
    v_usuario_name VARCHAR(100);
BEGIN
    -- Verificar permiso
    v_permiso_activar := verificar_permiso(p_activado_por, 'editar_usuario');
    
    IF NOT v_permiso_activar THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'No tiene permiso para activar usuarios'
        );
    END IF;
    
    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_usuario_id) THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Obtener nombre para auditoría
    SELECT name INTO v_usuario_name FROM users WHERE id = p_usuario_id;
    
    -- Activar usuario
    UPDATE users
    SET estado = 'activo',
        updated_at = NOW()
    WHERE id = p_usuario_id;
    
    -- Registrar en auditoría
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles)
    VALUES (
        p_activado_por,
        'activar_usuario',
        'usuario',
        p_usuario_id,
        jsonb_build_object('usuario', v_usuario_name)
    );
    
    RETURN jsonb_build_object(
        'exito', TRUE,
        'message', 'Usuario activado exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 24. OBTENER ROLES DE USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION obtener_roles_usuario(
    p_usuario_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_roles JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'nombre', r.nombre,
            'descripcion', r.descripcion,
            'asignado_en', ur.created_at
        )
    ) INTO v_roles
    FROM usuario_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.usuario_id = p_usuario_id
      AND r.estado = 'activo';
    
    RETURN COALESCE(v_roles, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 25. OBTENER PERMISOS DE ROL
-- ============================================
CREATE OR REPLACE FUNCTION obtener_permisos_rol(
    p_role_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_permisos JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'nombre', p.nombre,
            'descripcion', p.descripcion,
            'modulo', p.modulo
        )
    ) INTO v_permisos
    FROM role_permisos rp
    JOIN permisos p ON rp.permiso_id = p.id
    WHERE rp.role_id = p_role_id
      AND p.estado = 'activo';
    
    RETURN COALESCE(v_permisos, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION generar_numero_boucher() IS 'Genera número de boucher único en formato B-NNNNNN (ej. B-000013)';
COMMENT ON FUNCTION verificar_restriccion_numero(INTEGER, INTEGER, DATE) IS 'Verifica si un número está restringido para un turno y fecha';
COMMENT ON FUNCTION actualizar_contador_restriccion(INTEGER, INTEGER, DATE) IS 'Actualiza contador de restricción y marca como restringido si alcanza límite';
COMMENT ON FUNCTION crear_venta(INTEGER, INTEGER, DATE, JSONB, TEXT) IS 'Crea una venta completa con validaciones y actualizaciones';
COMMENT ON FUNCTION cerrar_turno(INTEGER, DATE, INTEGER, TEXT) IS 'Marca un turno como cerrado y calcula totales';
COMMENT ON FUNCTION obtener_cierre_turno(INTEGER, DATE) IS 'Obtiene resumen de ventas agrupadas por turno y fecha (cierre de turno)';
COMMENT ON FUNCTION buscar_boucher(VARCHAR) IS 'Busca un boucher por su número para reclamos';
COMMENT ON FUNCTION verificar_permiso(INTEGER, VARCHAR) IS 'Verifica si un usuario tiene un permiso específico';
COMMENT ON FUNCTION obtener_numero_mas_vendido(DATE, DATE) IS 'Obtiene los números más vendidos en un rango de fechas';
COMMENT ON FUNCTION obtener_numero_mas_veces_ganador(DATE) IS 'Obtiene los números más veces ganadores en una fecha';
COMMENT ON FUNCTION obtener_empleado_mas_ventas(DATE, DATE) IS 'Obtiene los empleados con más ventas en un rango de fechas';
COMMENT ON FUNCTION verificar_alerta_cierre_turno(INTEGER) IS 'Verifica el estado de alerta de cierre de turno';
COMMENT ON FUNCTION crear_alerta_restriccion(INTEGER, INTEGER, DATE) IS 'Crea alertas de restricción para todos los usuarios';
COMMENT ON FUNCTION obtener_ventas_por_turno(INTEGER, DATE, INTEGER, INTEGER, INTEGER) IS 'Obtiene ventas de un turno específico (para mostrar al hacer click en turno)';
COMMENT ON FUNCTION obtener_historial_ventas(INTEGER, DATE, DATE, INTEGER, INTEGER, INTEGER) IS 'Obtiene historial de ventas con paginación y filtros';
COMMENT ON FUNCTION registrar_usuario(VARCHAR, VARCHAR, INTEGER, INTEGER[]) IS 'Registra un nuevo usuario (nombre, telefono 8 dígitos, creado_por_id, role_ids)';
COMMENT ON FUNCTION login_usuario(VARCHAR) IS 'Login por teléfono (8 dígitos)';
COMMENT ON FUNCTION obtener_permisos_usuario(INTEGER) IS 'Obtiene todos los permisos de un usuario';
COMMENT ON FUNCTION asignar_rol_usuario(INTEGER, INTEGER, INTEGER) IS 'Asigna un rol a un usuario';
COMMENT ON FUNCTION remover_rol_usuario(INTEGER, INTEGER, INTEGER) IS 'Remueve un rol de un usuario';
COMMENT ON FUNCTION asignar_permiso_rol(INTEGER, INTEGER, INTEGER) IS 'Asigna un permiso a un rol';
COMMENT ON FUNCTION remover_permiso_rol(INTEGER, INTEGER, INTEGER) IS 'Remueve un permiso de un rol';
COMMENT ON FUNCTION actualizar_password(INTEGER, TEXT, TEXT) IS 'Actualiza la contraseña de un usuario';
COMMENT ON FUNCTION desactivar_usuario(INTEGER, INTEGER) IS 'Desactiva un usuario';
COMMENT ON FUNCTION activar_usuario(INTEGER, INTEGER) IS 'Activa un usuario';
COMMENT ON FUNCTION obtener_roles_usuario(INTEGER) IS 'Obtiene todos los roles de un usuario';
COMMENT ON FUNCTION obtener_permisos_rol(INTEGER) IS 'Obtiene todos los permisos de un rol';

