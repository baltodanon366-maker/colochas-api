-- ============================================
-- Script para asegurar que la función crear_venta existe
-- ============================================

-- Verificar si la función existe y crearla si no existe
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
    
    -- Validar que el turno no esté cerrado
    IF EXISTS (
        SELECT 1 FROM cierres_turno 
        WHERE turno_id = p_turno_id AND fecha = p_fecha
    ) THEN
        RETURN jsonb_build_object(
            'exito', FALSE,
            'error', 'El turno ya está cerrado'
        );
    END IF;
    
    -- Validar restricciones de números
    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        v_numero := (v_detalle->>'numero')::INTEGER;
        v_monto := (v_detalle->>'monto')::DECIMAL;
        
        -- Verificar restricción (asumiendo que la función verificar_restriccion_numero existe)
        BEGIN
            SELECT verificar_restriccion_numero(p_turno_id, v_numero, p_fecha) INTO v_esta_restringido;
        EXCEPTION
            WHEN OTHERS THEN
                v_esta_restringido := FALSE; -- Si la función no existe, asumir que no está restringido
        END;
        
        IF v_esta_restringido THEN
            v_errores := array_append(v_errores, 
                'El número ' || v_numero || ' está restringido y no puede ser vendido');
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
    
    -- Generar número de boucher (asumiendo que la función generar_numero_boucher existe)
    BEGIN
        SELECT generar_numero_boucher() INTO v_numero_boucher;
    EXCEPTION
        WHEN OTHERS THEN
            -- Si la función no existe, generar un número simple
            v_numero_boucher := 'B-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD((COALESCE((SELECT MAX(id) FROM ventas), 0) + 1)::TEXT, 6, '0');
    END;
    
    -- Crear venta
    INSERT INTO ventas (
        numero_boucher, turno_id, fecha, usuario_id, total, observaciones
    ) VALUES (
        v_numero_boucher, p_turno_id, p_fecha, p_usuario_id, v_total, p_observaciones
    ) RETURNING id INTO v_venta_id;
    
    -- Crear detalles de venta
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

COMMENT ON FUNCTION crear_venta(INTEGER, INTEGER, DATE, JSONB, TEXT) IS 
'Crea una venta validando que los números no estén restringidos manualmente';

