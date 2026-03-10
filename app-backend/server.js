import app from "./src/app.js";
import { initializeDatabase } from "./src/database/init.js";
import { initPool, getPool } from "./src/config/database.js";
import Token from "./src/models/Token.js";
import logger from './src/utils/logger.js';

// ── Startup environment validation ───────────────────────────────────────────
const REQUIRED_ENV = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_PASSWORD',
  'DB_NAME',
  'FRONTEND_URL',
];

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const MIN_SECRET_LENGTH = 32;
const weakSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter(
  (k) => (process.env[k] || '').length < MIN_SECRET_LENGTH
);
if (weakSecrets.length > 0) {
  console.error(`[startup] JWT secret(s) too short (< ${MIN_SECRET_LENGTH} chars): ${weakSecrets.join(', ')}`);
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

// Initialize database pool
initPool();

//intialize database tables
await initializeDatabase();

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`✓ Server is ready and listening on http://localhost:${PORT}`);
});

// Purge expired tokens every 6 hours
setInterval(async () => {
  try {
    await Token.deleteExpiredTokens();
    logger.info('Expired tokens purged');
  } catch (err) {
    logger.error('Token cleanup failed', { error: err.message });
  }
}, 6 * 60 * 60 * 1000);

// Prevent process from exiting
process.stdin.resume();

// Handle server errors
server.on('error', (error) => {
  console.error("EXPLICIT SERVER ERROR CAUGHT: ", error);
  logger.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received, closing server...`);
  server.close(async () => {
    try {
      await getPool().end();
      logger.info('Database pool closed');
    } catch (_) {}
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
