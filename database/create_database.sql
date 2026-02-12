-- ============================================
-- Script de Creación de Base de Datos
-- Sistema de Control de Rifas
-- PostgreSQL
-- ============================================

-- Crear base de datos (ejecutar como superusuario)
-- CREATE DATABASE colochas_db;
-- \c colochas_db;

-- ============================================
-- ENUMS
-- ============================================

-- Estado general para catálogos
CREATE TYPE estado_general AS ENUM ('activo', 'inactivo');

-- Nota: Cierre de turno es una vista/consulta, no una tabla

-- Tipo de alerta
CREATE TYPE tipo_alerta AS ENUM ('restriccion_numero', 'cierre_turno', 'bloqueo_ventas');

-- Estado de alerta
CREATE TYPE estado_alerta AS ENUM ('activa', 'vista', 'resuelta');

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- 1. ROLES (Catálogo)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    estado estado_general DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_roles_nombre ON roles(nombre);
CREATE INDEX idx_roles_estado ON roles(estado);

-- 2. PERMISOS (Catálogo)
CREATE TABLE permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    modulo VARCHAR(50) NOT NULL,
    estado estado_general DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_permisos_nombre ON permisos(nombre);
CREATE INDEX idx_permisos_modulo ON permisos(modulo);
CREATE INDEX idx_permisos_estado ON permisos(estado);

-- 3. USUARIOS/EMPLEADOS (login por nombre + teléfono 8 dígitos)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    telefono VARCHAR(8) UNIQUE NOT NULL,
    estado estado_general DEFAULT 'activo',
    last_login TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_telefono ON users(telefono);
CREATE INDEX idx_users_estado ON users(estado);

-- 4. USUARIO_ROLE (Relación Usuario-Rol)
CREATE TABLE usuario_roles (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    asignado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(usuario_id, role_id)
);

CREATE INDEX idx_usuario_roles_usuario ON usuario_roles(usuario_id);
CREATE INDEX idx_usuario_roles_role ON usuario_roles(role_id);

-- 5. ROLE_PERMISO (Relación Rol-Permiso)
CREATE TABLE role_permisos (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permiso_id)
);

CREATE INDEX idx_role_permisos_role ON role_permisos(role_id);
CREATE INDEX idx_role_permisos_permiso ON role_permisos(permiso_id);

-- 6. TURNOS (Catálogo)
CREATE TABLE turnos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    hora VARCHAR(10),
    hora_cierre VARCHAR(10),
    tiempo_alerta INTEGER DEFAULT 10,
    tiempo_bloqueo INTEGER DEFAULT 5,
    descripcion TEXT,
    mensaje TEXT,
    estado estado_general DEFAULT 'activo',
    created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_turnos_nombre ON turnos(nombre);
CREATE INDEX idx_turnos_estado ON turnos(estado);

-- 7. VENTAS (Bouchers/Facturas)
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    numero_boucher VARCHAR(50) UNIQUE NOT NULL,
    turno_id INTEGER NOT NULL REFERENCES turnos(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    fecha_hora TIMESTAMP DEFAULT NOW(),
    usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total DECIMAL(10, 2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (total >= 0)
);

CREATE INDEX idx_ventas_numero_boucher ON ventas(numero_boucher);
CREATE INDEX idx_ventas_turno_fecha ON ventas(turno_id, fecha);
CREATE INDEX idx_ventas_usuario_turno_fecha ON ventas(usuario_id, turno_id, fecha); -- Para consultar ventas de usuario por turno
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);

-- 8. DETALLES DE VENTA
CREATE TABLE detalles_venta (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (numero >= 0 AND numero <= 99),
    CHECK (monto >= 0)
);

CREATE INDEX idx_detalles_venta_venta ON detalles_venta(venta_id);
CREATE INDEX idx_detalles_venta_numero ON detalles_venta(numero);

-- 9. CIERRES DE TURNO (Marcador de cierre - solo para marcar que un turno fue cerrado)
CREATE TABLE cierres_turno (
    id SERIAL PRIMARY KEY,
    turno_id INTEGER NOT NULL REFERENCES turnos(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    cerrado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cerrado_en TIMESTAMP DEFAULT NOW(),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(turno_id, fecha)
);

CREATE INDEX idx_cierres_turno_turno ON cierres_turno(turno_id);
CREATE INDEX idx_cierres_turno_fecha ON cierres_turno(fecha);
CREATE INDEX idx_cierres_turno_cerrado_en ON cierres_turno(cerrado_en);

-- 10. RESTRICCIONES DE NÚMEROS
CREATE TABLE restricciones_numeros (
    id SERIAL PRIMARY KEY,
    turno_id INTEGER NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    fecha DATE NOT NULL,
    limite_ventas INTEGER NOT NULL,
    ventas_actuales INTEGER DEFAULT 0,
    esta_restringido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(turno_id, numero, fecha),
    CHECK (numero >= 0 AND numero <= 99),
    CHECK (limite_ventas > 0),
    CHECK (ventas_actuales >= 0)
);

CREATE INDEX idx_restricciones_turno_fecha ON restricciones_numeros(turno_id, fecha);
CREATE INDEX idx_restricciones_numero ON restricciones_numeros(numero);
CREATE INDEX idx_restricciones_restringido ON restricciones_numeros(esta_restringido);

-- 11. SORTEOS (Para KPIs)
CREATE TABLE sorteos (
    id SERIAL PRIMARY KEY,
    turno_id INTEGER NOT NULL REFERENCES turnos(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    numero_ganador INTEGER NOT NULL,
    monto_premio DECIMAL(10, 2),
    descripcion TEXT,
    realizado_por INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    realizado_en TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(turno_id, fecha),
    CHECK (numero_ganador >= 0 AND numero_ganador <= 99),
    CHECK (monto_premio IS NULL OR monto_premio >= 0)
);

CREATE INDEX idx_sorteos_turno ON sorteos(turno_id);
CREATE INDEX idx_sorteos_fecha ON sorteos(fecha);
CREATE INDEX idx_sorteos_numero_ganador ON sorteos(numero_ganador);

-- 12. ALERTAS
CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo tipo_alerta NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    numero INTEGER,
    turno_id INTEGER REFERENCES turnos(id) ON DELETE CASCADE,
    estado estado_alerta DEFAULT 'activa',
    vista_en TIMESTAMP,
    resuelta_en TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (numero IS NULL OR (numero >= 0 AND numero <= 99))
);

CREATE INDEX idx_alertas_usuario_estado ON alertas(usuario_id, estado);
CREATE INDEX idx_alertas_tipo ON alertas(tipo);
CREATE INDEX idx_alertas_created_at ON alertas(created_at);

-- 13. CONFIGURACIONES (Catálogo)
CREATE TABLE configuraciones (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT 'string',
    estado estado_general DEFAULT 'activo',
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_configuraciones_clave ON configuraciones(clave);
CREATE INDEX idx_configuraciones_estado ON configuraciones(estado);

-- 14. AUDITORÍA
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id INTEGER,
    detalles JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_entidad ON auditoria(entidad, entidad_id);
CREATE INDEX idx_auditoria_created_at ON auditoria(created_at);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permisos_updated_at BEFORE UPDATE ON permisos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuario_roles_updated_at BEFORE UPDATE ON usuario_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turnos_updated_at BEFORE UPDATE ON turnos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON ventas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER update_restricciones_numeros_updated_at BEFORE UPDATE ON restricciones_numeros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cierres_turno_updated_at BEFORE UPDATE ON cierres_turno
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sorteos_updated_at BEFORE UPDATE ON sorteos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alertas_updated_at BEFORE UPDATE ON alertas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuraciones_updated_at BEFORE UPDATE ON configuraciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (SEED)
-- ============================================

-- Insertar roles iniciales
INSERT INTO roles (nombre, descripcion, estado) VALUES
('admin', 'Administrador del sistema', 'activo'),
('vendedor', 'Vendedor de rifas', 'activo');

-- Insertar permisos básicos
INSERT INTO permisos (nombre, descripcion, modulo, estado) VALUES
-- Usuarios
('crear_usuario', 'Crear nuevos usuarios', 'usuarios', 'activo'),
('editar_usuario', 'Editar usuarios existentes', 'usuarios', 'activo'),
('desactivar_usuario', 'Desactivar usuarios', 'usuarios', 'activo'),
('ver_usuarios', 'Ver lista de usuarios', 'usuarios', 'activo'),
-- Turnos
('crear_turno', 'Crear nuevos turnos', 'turnos', 'activo'),
('editar_turno', 'Editar turnos existentes', 'turnos', 'activo'),
('desactivar_turno', 'Desactivar turnos', 'turnos', 'activo'),
('ver_turnos', 'Ver lista de turnos', 'turnos', 'activo'),
-- Ventas
('crear_venta', 'Crear nuevas ventas', 'ventas', 'activo'),
('ver_ventas', 'Ver lista de ventas', 'ventas', 'activo'),
('ver_historial', 'Ver historial de ventas', 'ventas', 'activo'),
-- Cierre de Turno
('cerrar_turno', 'Cerrar turnos', 'cierres', 'activo'),
('ver_cierres', 'Ver cierres de turno', 'cierres', 'activo'),
-- Restricciones
('configurar_restricciones', 'Configurar restricciones de números', 'restricciones', 'activo'),
('ver_restricciones', 'Ver restricciones', 'restricciones', 'activo'),
-- Sorteos
('crear_sorteo', 'Crear sorteos', 'sorteos', 'activo'),
('ver_sorteos', 'Ver sorteos', 'sorteos', 'activo'),
-- Reportes y KPIs
('ver_reportes', 'Ver reportes y estadísticas', 'reportes', 'activo'),
('ver_kpis', 'Ver KPIs del sistema', 'reportes', 'activo'),
-- Configuración
('editar_configuracion', 'Editar configuración del sistema', 'configuracion', 'activo'),
('ver_configuracion', 'Ver configuración del sistema', 'configuracion', 'activo');

-- Asignar todos los permisos al rol admin
INSERT INTO role_permisos (role_id, permiso_id)
SELECT 1, id FROM permisos;

-- Asignar permisos básicos al rol vendedor
INSERT INTO role_permisos (role_id, permiso_id)
SELECT 2, id FROM permisos
WHERE nombre IN (
    'ver_turnos',
    'crear_venta',
    'ver_ventas',
    'ver_historial',
    'ver_restricciones'
);

-- Insertar usuario admin inicial (teléfono 8 dígitos - cambiar en producción)
INSERT INTO users (name, telefono, estado, created_at) VALUES
('Administrador', '12345678', 'activo', NOW());

-- Asignar rol admin al usuario inicial
INSERT INTO usuario_roles (usuario_id, role_id, created_at) VALUES
(1, 1, NOW());

-- Insertar configuraciones iniciales
INSERT INTO configuraciones (clave, valor, descripcion, tipo, estado) VALUES
('limite_ventas.por_defecto', '100', 'Límite por defecto de ventas por número', 'number', 'activo'),
('impresora.nombre', 'BlueTooth Printer', 'Nombre de la impresora Bluetooth', 'string', 'activo'),
('impresora.imprimir_ticket', 'true', 'Imprimir ticket automáticamente', 'boolean', 'activo'),
('sistema.descripcion', 'Sistema de Control de Rifas', 'Descripción del sistema', 'string', 'activo');

-- ============================================
-- COMENTARIOS EN TABLAS
-- ============================================

COMMENT ON TABLE roles IS 'Catálogo de roles del sistema';
COMMENT ON TABLE permisos IS 'Catálogo de permisos del sistema';
COMMENT ON TABLE users IS 'Usuarios/empleados del sistema';
COMMENT ON TABLE usuario_roles IS 'Relación muchos a muchos entre usuarios y roles';
COMMENT ON TABLE role_permisos IS 'Relación muchos a muchos entre roles y permisos';
COMMENT ON TABLE turnos IS 'Catálogo de turnos configurados';
COMMENT ON TABLE ventas IS 'Bouchers/Facturas de venta';
COMMENT ON TABLE detalles_venta IS 'Números vendidos en cada venta';
COMMENT ON TABLE cierres_turno IS 'Marcador de cierre de turno (las ventas se agregan automáticamente)';
-- Vista para Cierre de Turno (agrupa ventas por turno y fecha)
CREATE OR REPLACE VIEW vw_cierres_turno AS
SELECT 
    v.turno_id,
    t.nombre as turno_nombre,
    v.fecha,
    COUNT(v.id) as total_ventas,
    COALESCE(SUM(v.total), 0) as total_monto,
    MIN(v.fecha_hora) as primera_venta,
    MAX(v.fecha_hora) as ultima_venta
FROM ventas v
JOIN turnos t ON v.turno_id = t.id
WHERE t.estado = 'activo'
GROUP BY v.turno_id, t.nombre, v.fecha;

COMMENT ON VIEW vw_cierres_turno IS 'Vista que agrupa ventas por turno y fecha (cierre de turno)';
COMMENT ON TABLE restricciones_numeros IS 'Control de límites de ventas por número';
COMMENT ON TABLE sorteos IS 'Resultados de sorteos para KPIs';
COMMENT ON TABLE alertas IS 'Alertas del sistema guardadas en BD';
COMMENT ON TABLE configuraciones IS 'Configuración del sistema';
COMMENT ON TABLE auditoria IS 'Log de auditoría de acciones del sistema';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

