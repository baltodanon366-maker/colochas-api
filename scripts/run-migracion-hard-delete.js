/**
 * Ejecuta la migración para permitir hard delete de usuarios:
 * - Ventas: ON DELETE CASCADE (al borrar usuario se borran sus ventas)
 * - Turnos/Sorteos: created_by_id y realizado_por NULLables + ON DELETE SET NULL
 *
 * Uso: node scripts/run-migracion-hard-delete.js
 * Requiere: .env con DATABASE_URL (o DATABASE_URL en entorno)
 */

const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en .env o en el entorno');
  process.exit(1);
}

const statements = [
  {
    name: 'Ventas: FK usuario_id ON DELETE CASCADE',
    sql: `
      ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_usuario_id_fkey;
      ALTER TABLE ventas
        ADD CONSTRAINT ventas_usuario_id_fkey
        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE;
    `,
  },
  {
    name: 'Turnos: created_by_id nullable + SET NULL',
    sql: `
      ALTER TABLE turnos ALTER COLUMN created_by_id DROP NOT NULL;
      ALTER TABLE turnos DROP CONSTRAINT IF EXISTS turnos_created_by_id_fkey;
      ALTER TABLE turnos
        ADD CONSTRAINT turnos_created_by_id_fkey
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;
    `,
  },
  {
    name: 'Sorteos: realizado_por nullable + SET NULL',
    sql: `
      ALTER TABLE sorteos ALTER COLUMN realizado_por DROP NOT NULL;
      ALTER TABLE sorteos DROP CONSTRAINT IF EXISTS sorteos_realizado_por_fkey;
      ALTER TABLE sorteos
        ADD CONSTRAINT sorteos_realizado_por_fkey
        FOREIGN KEY (realizado_por) REFERENCES users(id) ON DELETE SET NULL;
    `,
  },
];

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    for (const { name, sql } of statements) {
      console.log('📋', name);
      await client.query(sql.trim());
      console.log('   OK\n');
    }

    console.log('🎉 Migración hard delete completada correctamente.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
