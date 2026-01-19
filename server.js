import { configDotenv } from "dotenv";
configDotenv();

import app from "./src/app.js";
import { initializeDatabase } from "./src/database/init.js";
import { initPool } from "./src/config/database.js";
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 3000;

// Initialize database pool
initPool();

//intialize database tables
await initializeDatabase();

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
