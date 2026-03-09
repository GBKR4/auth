// Route aggregator
import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import googleAuthRoutes from './googleAuth.js';
const router = Router();

router.use('/auth', authRoutes);
router.use('/auth', googleAuthRoutes);
router.use('/user', userRoutes);
export default router;