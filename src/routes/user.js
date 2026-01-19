// User routes
import { Router } from 'express';
import userController from '../controllers/userController.js';
import { authorizeRoles, authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/profile', authenticateToken, userController.getUserProfile);
router.put('/profile', authenticateToken, userController.updateUserProfile);
router.put('/change-password', authenticateToken, userController.changeUserPassword);
router.delete('/delete-account', authenticateToken, authorizeRoles('user', 'admin'), userController.deleteUserAccount);
router.get('/users', authenticateToken, authorizeRoles('admin'), userController.getAllUsers);

export default router;