-- ============================================
-- MIGRACIÓN: Agregar límites de monto y tipo a restricciones
-- ============================================
-- Este script agrega los campos necesarios para soportar
-- restricciones con límites de monto o cantidad

-- 1. Agregar columnas nuevas
ALTER TABLE restricciones_numeros
ADD COLUMN IF NOT EXISTS tipo_restriccion VARCHAR(20) DEFAULT 'completo',
ADD COLUMN IF NOT EXISTS limite_monto DECIMAL(10, 2) NULL,
ADD COLUMN IF NOT EXISTS limite_cantidad INTEGER NULL;

-- 2. Agregar constraint para validar tipo_restriccion
ALTER TABLE restricciones_numeros
ADD CONSTRAINT check_tipo_restriccion 
CHECK (tipo_restriccion IN ('completo', 'monto', 'cantidad'));

-- 3. Agregar constraint para validar que si tipo_restriccion = 'monto', limite_monto debe estar presente
ALTER TABLE restricciones_numeros
ADD CONSTRAINT check_limite_monto 
CHECK (
  (tipo_restriccion != 'monto') OR 
  (tipo_restriccion = 'monto' AND limite_monto IS NOT NULL AND limite_monto > 0)
);

-- 4. Agregar constraint para validar que si tipo_restriccion = 'cantidad', limite_cantidad debe estar presente
ALTER TABLE restricciones_numeros
ADD CONSTRAINT check_limite_cantidad 
CHECK (
  (tipo_restriccion != 'cantidad') OR 
  (tipo_restriccion = 'cantidad' AND limite_cantidad IS NOT NULL AND limite_cantidad > 0)
);

-- 5. Actualizar registros existentes para asegurar que tienen tipo_restriccion = 'completo'
UPDATE restricciones_numeros
SET tipo_restriccion = 'completo'
WHERE tipo_restriccion IS NULL;

-- 6. Agregar índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_restricciones_tipo 
ON restricciones_numeros(tipo_restriccion);

CREATE INDEX IF NOT EXISTS idx_restricciones_limite_monto 
ON restricciones_numeros(limite_monto) 
WHERE limite_monto IS NOT NULL;

-- 7. Comentarios en las columnas
COMMENT ON COLUMN restricciones_numeros.tipo_restriccion IS 'Tipo de restricción: completo (bloquea todo), monto (limita por monto), cantidad (limita por cantidad)';
COMMENT ON COLUMN restricciones_numeros.limite_monto IS 'Límite de monto en córdobas si tipo_restriccion = monto';
COMMENT ON COLUMN restricciones_numeros.limite_cantidad IS 'Límite de cantidad de ventas si tipo_restriccion = cantidad';

