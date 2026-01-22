-- Script para eliminar los turnos antiguos que ya no se utilizan
-- TURNO MAÑANA, TURNO TARDE, TURNO NOCHE

-- Verificar primero qué turnos se van a eliminar
SELECT id, nombre, categoria, estado, created_at
FROM turnos
WHERE nombre IN ('TURNO MAÑANA', 'TURNO TARDE', 'TURNO NOCHE');

-- Eliminar los turnos antiguos
-- Nota: Solo se eliminarán si no tienen ventas o restricciones asociadas
-- Si tienen datos asociados, primero se deben manejar esos datos

DELETE FROM turnos
WHERE nombre IN ('TURNO MAÑANA', 'TURNO TARDE', 'TURNO NOCHE')
  AND id NOT IN (
    SELECT DISTINCT turno_id FROM ventas WHERE turno_id IS NOT NULL
    UNION
    SELECT DISTINCT turno_id FROM restricciones_numeros WHERE turno_id IS NOT NULL
    UNION
    SELECT DISTINCT turno_id FROM cierres_turno WHERE turno_id IS NOT NULL
  );

-- Verificar que se eliminaron
SELECT id, nombre, categoria, estado
FROM turnos
ORDER BY categoria, hora;

