// Database configuration
import pg from 'pg';
import logger from '../utils/logger.js';
const { Pool } = pg;

let pool = null;

// Create pool connection (called after env vars are loaded)
export const initPool = () => {
  if (pool) return pool;

  const dbConfig = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'auth_database',
    max:                    20,
    idleTimeoutMillis:      30000,
    connectionTimeoutMillis: 5000,
  };

  // SSL support — required for managed Postgres hosts (Render, Railway, Supabase, RDS, etc.)
  if (process.env.DB_SSL === 'true') {
    dbConfig.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  }

  pool = new Pool(dbConfig);

  pool.on('connect', () => {
    logger.info('PostgreSQL client connected');
  });

  pool.on('error', (err) => {
    // Log the error but do NOT call process.exit here — the pool will attempt
    // to acquire a new client on the next query, giving transient errors a chance
    // to recover. Only crash on truly unrecoverable situations.
    logger.error({ error: err.message }, 'Unexpected error on idle PostgreSQL client');
  });

  return pool;
};

// Get pool instance (auto-initialises if not done yet)
export const getPool = () => {
  if (!pool) return initPool();
  return pool;
};

// Alias for legacy import style
export { getPool as pool };

// Convenience wrappers
export const query     = (text, params) => getPool().query(text, params);
export const getClient = ()             => getPool().connect();
