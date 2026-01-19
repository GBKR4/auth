// Database configuration
import pg from 'pg';
import logger from '../utils/logger.js';
const { Pool } = pg;

let pool = null;

// Create pool connection (called after env vars are loaded)
export const initPool = () => {
  if (pool) return pool;

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'auth_database',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  // Validate config
  if (!dbConfig.password) {
    logger.error('Database password is not set in environment variables');
  }

  pool = new Pool(dbConfig);

  // Test the connection
  pool.on('connect', () => {
    logger.info('PostgreSQL connected successfully');
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
    process.exit(-1);
  });

  return pool;
};

// Get pool instance
export const getPool = () => {
  if (!pool) {
    return initPool();
  }
  return pool;
};

// Export pool getter with same interface
export { getPool as pool };

// Helper function to execute queries
export const query = (text, params) => getPool().query(text, params);

// Helper function to get a client from the pool
export const getClient = () => getPool().connect();

