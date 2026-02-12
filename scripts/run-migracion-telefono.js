/**
 * Ejecuta la migración de users (email/password_hash -> telefono 8 dígitos)
 * y actualiza los procedimientos almacenados registrar_usuario y login_usuario.
 *
 * Uso: node scripts/run-migracion-telefono.js
 * Requiere: .env con DATABASE_URL
 */

const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}

const migrationStatements = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR(8);`,
  `UPDATE users SET telefono = LPAD((id::text || '000000'), 8, '0') WHERE telefono IS NULL;`,
  `UPDATE users SET telefono = '12345678' WHERE id = 1 AND (telefono = '10000000' OR telefono IS NULL);`,
  `ALTER TABLE users ALTER COLUMN telefono SET NOT NULL;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telefono ON users(telefono);`,
  `ALTER TABLE users DROP COLUMN IF EXISTS email;`,
  `ALTER TABLE users DROP COLUMN IF EXISTS password_hash;`,
  `DROP INDEX IF EXISTS idx_users_email;`,
];

const registrarUsuarioSQL = `
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
    v_permiso_crear := verificar_permiso(p_created_by_id, 'crear_usuario');
    IF NOT v_permiso_crear THEN
        RETURN jsonb_build_object('exito', FALSE, 'error', 'No tiene permiso para crear usuarios');
    END IF;
    IF EXISTS (SELECT 1 FROM users WHERE telefono = p_telefono) THEN
        RETURN jsonb_build_object('exito', FALSE, 'error', 'El teléfono ya está registrado');
    END IF;
    INSERT INTO users (name, telefono, estado, created_by_id, created_at, updated_at)
    VALUES (p_name, p_telefono, 'activo', p_created_by_id, NOW(), NOW())
    RETURNING id INTO v_usuario_id;
    IF array_length(p_role_ids, 1) > 0 THEN
        FOREACH v_role_id IN ARRAY p_role_ids
        LOOP
            IF EXISTS (SELECT 1 FROM roles WHERE id = v_role_id AND estado = 'activo') THEN
                INSERT INTO usuario_roles (usuario_id, role_id, asignado_por, created_at, updated_at)
                VALUES (v_usuario_id, v_role_id, p_created_by_id, NOW(), NOW())
                ON CONFLICT (usuario_id, role_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id)
    VALUES (p_created_by_id, 'crear_usuario', 'usuario', v_usuario_id);
    RETURN jsonb_build_object('exito', TRUE, 'usuario_id', v_usuario_id, 'message', 'Usuario creado exitosamente');
END;
$$ LANGUAGE plpgsql;
`;

const loginUsuarioSQL = `
CREATE OR REPLACE FUNCTION login_usuario(
    p_name VARCHAR(100),
    p_telefono VARCHAR(8)
)
RETURNS JSONB AS $$
DECLARE
    v_usuario_id INTEGER;
    v_name VARCHAR(100);
    v_telefono VARCHAR(8);
    v_estado VARCHAR(20);
    v_last_login TIMESTAMP;
    v_roles JSONB;
BEGIN
    SELECT id, name, telefono, estado, last_login
    INTO v_usuario_id, v_name, v_telefono, v_estado, v_last_login
    FROM users
    WHERE name = p_name AND telefono = p_telefono;
    IF v_usuario_id IS NULL THEN
        RETURN jsonb_build_object('exito', FALSE, 'error', 'Credenciales inválidas');
    END IF;
    IF v_estado != 'activo' THEN
        RETURN jsonb_build_object('exito', FALSE, 'error', 'Usuario inactivo');
    END IF;
    UPDATE users SET last_login = NOW() WHERE id = v_usuario_id;
    SELECT jsonb_agg(jsonb_build_object('id', r.id, 'nombre', r.nombre, 'descripcion', r.descripcion))
    INTO v_roles
    FROM usuario_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.usuario_id = v_usuario_id AND r.estado = 'activo';
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id)
    VALUES (v_usuario_id, 'login', 'usuario', v_usuario_id);
    RETURN jsonb_build_object(
        'exito', TRUE,
        'usuario', jsonb_build_object('id', v_usuario_id, 'name', v_name, 'telefono', v_telefono, 'last_login', v_last_login),
        'roles', COALESCE(v_roles, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;
`;

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Migración de tabla users
    console.log('📋 Ejecutando migración de tabla users...');
    for (let i = 0; i < migrationStatements.length; i++) {
      const sql = migrationStatements[i].trim();
      if (!sql) continue;
      try {
        await client.query(sql);
        console.log(`   OK: ${sql.substring(0, 60)}...`);
      } catch (err) {
        if (err.code === '42701') {
          console.log(`   (omitido - columna ya existe): ${sql.substring(0, 50)}...`);
        } else if (err.message && err.message.includes('does not exist')) {
          console.log(`   (omitido - no existe): ${sql.substring(0, 50)}...`);
        } else {
          throw err;
        }
      }
    }
    console.log('✅ Migración de tabla users completada.\n');

    // 2. Procedimiento registrar_usuario
    console.log('📋 Actualizando función registrar_usuario...');
    await client.query(registrarUsuarioSQL);
    console.log('✅ registrar_usuario actualizado.\n');

    // 3. Procedimiento login_usuario
    console.log('📋 Actualizando función login_usuario...');
    await client.query(loginUsuarioSQL);
    console.log('✅ login_usuario actualizado.\n');

    console.log('🎉 Migración completada correctamente.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
