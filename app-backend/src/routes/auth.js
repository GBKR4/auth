import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as passwordController from '../controllers/passwordController.js';
import { 
  registerValidation, 
  loginValidation,
  emailValidation,
  passwordResetRequestValidation,
  passwordResetValidation
} from '../middlewares/validation.js';
import { 
  loginLimiter, 
  registerLimiter,
  passwordResetLimiter,
  resendVerificationLimiter
} from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/register', registerLimiter, registerValidation, authController.register);
router.post('/login', loginLimiter, loginValidation, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/verify/:token', authController.verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, emailValidation, authController.resendVerification);
router.post('/forgot-password', passwordResetLimiter, passwordResetRequestValidation, passwordController.forgotPassword);
router.post('/reset-password', passwordResetValidation, passwordController.resetPassword);
router.post('/validate-reset-token', passwordController.validatePasswordResetToken);

export default router;