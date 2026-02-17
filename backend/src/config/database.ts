// backend/src/config/database.ts

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================
// auth   → Cuentas TrinityCore (READ/WRITE limitado)
// characters → Personajes TrinityCore (READ)
// world  → Datos del mundo TrinityCore (READ)
// cms    → Todo lo del CMS: foros, noticias, devblog, caché
// ============================================================

function createPool(
  db: string,
  envPrefix: string,
  readOnly = false
) {
  return mysql.createPool({
    host:             process.env[`${envPrefix}_HOST`]     || process.env.DB_HOST     || '127.0.0.1',
    port:   parseInt(process.env[`${envPrefix}_PORT`]     || process.env.DB_PORT     || '3306'),
    user:             process.env[`${envPrefix}_USER`]     || process.env.DB_USER     || 'root',
    password:         process.env[`${envPrefix}_PASSWORD`] || process.env.DB_PASSWORD || '',
    database:         process.env[`${envPrefix}_NAME`]     || db,
    waitForConnections: true,
    connectionLimit:  parseInt(process.env[`${envPrefix}_POOL_SIZE`] || '10'),
    queueLimit:       0,
    timezone:         'Z',
    charset:          'utf8mb4',
    decimalNumbers:   true,
  });
}

// TrinityCore: cuentas de jugadores
export const authDB = createPool('auth', 'AUTH_DB');

// TrinityCore: personajes
export const charactersDB = createPool('characters', 'CHARACTERS_DB', true);

// TrinityCore: mundo
export const worldDB = createPool('world', 'WORLD_DB', true);

// CMS: foros, noticias, devblog, caché WotLKDB, etc.
export const cmsDB = createPool('cms', 'CMS_DB');

// ── Health check al arrancar ────────────────────────────────
async function testConnections() {
  const pools: [string, mysql.Pool][] = [
    ['auth',       authDB],
    ['characters', charactersDB],
    ['world',      worldDB],
    ['cms',        cmsDB],
  ];

  for (const [name, pool] of pools) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log(`✅ [DB] ${name} conectado`);
    } catch (err: any) {
      console.error(`❌ [DB] ${name} falló:`, err.message);
    }
  }
}

testConnections();