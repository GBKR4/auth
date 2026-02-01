import app from "./src/app.js";
import { initializeDatabase } from "./src/database/init.js";
import { initPool } from "./src/config/database.js";
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 3000;

// Initialize database pool
initPool();

//intialize database tables
await initializeDatabase();

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`✓ Server is ready and listening on http://localhost:${PORT}`);
});

// Prevent process from exiting
process.stdin.resume();

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
