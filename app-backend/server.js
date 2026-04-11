import app from "./src/app.js";
import { initializeDatabase } from "./src/database/init.js";
import { initPool, getPool } from "./src/config/database.js";
import Token from "./src/models/Token.js";
import logger from './src/utils/logger.js';

// ── Global error guards ───────────────────────────────────────────────────────
// Must be registered before anything else so even startup errors are caught.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection — shutting down');
  process.exit(1);
});
// ─────────────────────────────────────────────────────────────────────────────

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

// Initialize database tables
await initializeDatabase();

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`✓ Server is ready and listening on http://localhost:${PORT}`);
});

// ── Background token/session cleanup (every 6 hours) ─────────────────────────
setInterval(async () => {
  try {
    await Token.deleteExpiredTokens();
    logger.info('Expired tokens and stale login attempts purged');
  } catch (err) {
    logger.error({ error: err.message }, 'Token cleanup failed');
  }
}, 6 * 60 * 60 * 1000);
// ─────────────────────────────────────────────────────────────────────────────

// Prevent process from exiting in environments without active I/O
process.stdin.resume();

// Handle server-level errors (e.g. EADDRINUSE)
server.on('error', (error) => {
  logger.fatal({ error }, 'HTTP server error');
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — closing server…`);

  // Force-exit if graceful shutdown takes too long (e.g. hung keep-alive connections)
  const forceExit = setTimeout(() => {
    logger.fatal('Graceful shutdown timed out after 10 s — forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref(); // Don't prevent Node from exiting if everything closes cleanly

  server.close(async () => {
    clearTimeout(forceExit);
    try {
      await getPool().end();
      logger.info('Database pool closed');
    } catch (_) {}
    logger.info('Server closed cleanly');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
