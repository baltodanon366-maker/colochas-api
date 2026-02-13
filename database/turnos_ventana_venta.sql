-- Turnos con ventana de venta corregida (hora = inicio venta, hora_cierre = cierre venta)
-- La Diaria: 12 MD (06:00-12:00), 3 PM (12:00-15:00), 6 PM (15:00-18:00), 9 PM (18:00-21:00)
-- La Tica:   1 PM (06:00-13:00), 4:30 PM (13:00-16:30), 7:30 PM (16:30-19:30)
-- 10 min antes de hora_cierre se bloquea la venta (tiempo_bloqueo = 10)
-- Ejecutar en Neon. Si los IDs ya existen, hace UPDATE.

INSERT INTO turnos (
  id,
  nombre,
  categoria,
  hora,
  hora_cierre,
  tiempo_alerta,
  tiempo_bloqueo,
  descripcion,
  mensaje,
  estado,
  created_by_id,
  created_at,
  updated_at
) VALUES
  (4, '12 MD',    'diaria', '06:00', '12:00', 10, 10, 'Turno 12 MD - La Diaria',   NULL, 'activo', 1, NOW(), NOW()),
  (5, '3 PM',     'diaria', '12:00', '15:00', 10, 10, 'Turno 3 PM - La Diaria',    NULL, 'activo', 1, NOW(), NOW()),
  (6, '6 PM',     'diaria', '15:00', '18:00', 10, 10, 'Turno 6 PM - La Diaria',    NULL, 'activo', 1, NOW(), NOW()),
  (7, '9 PM',     'diaria', '18:00', '21:00', 10, 10, 'Turno 9 PM - La Diaria',    NULL, 'activo', 1, NOW(), NOW()),
  (8, '1 PM',     'tica',   '06:00', '13:00', 10, 10, 'Turno 1 PM - La Tica',      NULL, 'activo', 1, NOW(), NOW()),
  (9, '4:30 PM',  'tica',   '13:00', '16:30', 10, 10, 'Turno 4:30 PM - La Tica',   NULL, 'activo', 1, NOW(), NOW()),
  (10, '7:30 PM', 'tica',   '16:30', '19:30', 10, 10, 'Turno 7:30 PM - La Tica',   NULL, 'activo', 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  nombre         = EXCLUDED.nombre,
  categoria      = EXCLUDED.categoria,
  hora           = EXCLUDED.hora,
  hora_cierre    = EXCLUDED.hora_cierre,
  tiempo_alerta  = EXCLUDED.tiempo_alerta,
  tiempo_bloqueo = EXCLUDED.tiempo_bloqueo,
  descripcion    = EXCLUDED.descripcion,
  mensaje        = EXCLUDED.mensaje,
  estado         = EXCLUDED.estado,
  updated_at     = NOW();
