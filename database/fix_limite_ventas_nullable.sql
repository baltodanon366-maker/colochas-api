-- ============================================
-- FIX: Hacer limite_ventas nullable temporalmente
-- ============================================
-- Este script hace que limite_ventas sea nullable
-- para que funcione con el código actual
-- La migración completa eliminará esta columna

BEGIN;

-- Hacer limite_ventas nullable
ALTER TABLE restricciones_numeros 
ALTER COLUMN limite_ventas DROP NOT NULL;

-- Si hay restricciones CHECK que requieren limite_ventas > 0, eliminarlas
ALTER TABLE restricciones_numeros 
DROP CONSTRAINT IF EXISTS restricciones_numeros_limite_ventas_check;

COMMIT;

