import app from "./src/app.js";
import { initializeDatabase } from "./src/database/init.js";
import { initPool } from "./src/config/database.js";
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 3000;

// Initialize database pool
initPool();

//intialize database tables
await initializeDatabase();

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
