// Route aggregator
import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);

export default router;