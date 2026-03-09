// Route aggregator
import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import googleAuthRoutes from './googleAuth.js';
import { getPool } from '../config/database.js';

const router = Router();

// Health check — used by load balancers, Docker, and uptime monitors
router.get('/health', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

router.use('/auth', authRoutes);
router.use('/auth', googleAuthRoutes);
router.use('/user', userRoutes);
export default router;