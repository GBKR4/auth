// Route aggregator
import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import googleAuthRoutes from './googleAuth.js';
import { getPool } from '../config/database.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Global rate limit — 100 req / 15 min per IP across all endpoints
router.use(apiLimiter);

// Health check — used by load balancers, Docker, and uptime monitors
router.get('/health', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({
      status:  'ok',
      db:      'connected',
      uptime:  Math.floor(process.uptime()),
      env:     process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ts:      new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

router.use('/auth', authRoutes);
router.use('/auth', googleAuthRoutes);
router.use('/user', userRoutes);
export default router;