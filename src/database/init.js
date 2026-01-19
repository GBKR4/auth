// Database initialization script

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabase = async () => {
  try {
    logger.info('Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    logger.info('Database tables created successfully!');
    
    // Optionally run seed data (uncomment if you want test data)
    // const seedPath = path.join(__dirname, 'seed.sql');
    // if (fs.existsSync(seedPath)) {
    //   const seed = fs.readFileSync(seedPath, 'utf8');
    //   await pool.query(seed);
    //   console.log('✓ Seed data inserted successfully!');
    // }
    
    return true;
  } catch (error) {
    logger.error('Error initializing database', { error: error.message });
    throw error;
  }
};
