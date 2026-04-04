// Password controller - handles password reset/change
import { getPool } from '../config/database.js';
import User from '../models/User.js';
import hashService from '../services/hashService.js';
import tokenService from '../services/tokenService.js';
import Token from '../models/Token.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Request forgot password
const FORGOT_PASSWORD_MSG = 'If that email is registered, a password reset link has been sent.';

export const forgotPassword = async (req, res) => {
  try {
    const { email, clientUrl } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Always return same response to prevent email enumeration
      return res.status(200).json({ message: FORGOT_PASSWORD_MSG });
    }

    // Invalidate any existing reset tokens before creating a new one
    await Token.invalidateUserVerificationTokens(user.id, 'password_reset');

    const resetToken = tokenService.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await Token.createVerificationToken(user.id, resetToken, 'password_reset', expiresAt);
    await emailService.sendPasswordResetEmail(user.email, resetToken, clientUrl);
    logger.info('Password reset email sent', { userId: user.id });
    return res.status(200).json({ message: FORGOT_PASSWORD_MSG });
  } catch (error) {
    logger.error('Forgot password error', { error: error.message });
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const result = await Token.findVerificationToken(token, 'password_reset');
    if (!result) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const newHashedPassword = await hashService.hashPassword(newPassword);
    await User.updateById(result.user_id, { password_hash: newHashedPassword });
    await Token.markTokenAsUsed(token);
    logger.info('Password reset successful', { userId: result.user_id });
    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Reset password error', { error: error.message });
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};

// validate password reset token
export const validatePasswordResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await Token.findVerificationToken(token, 'password_reset');
    if (!result) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    return res.status(200).json({ message: 'Password reset token is valid' });
  } catch (error) {
    logger.error('Validate reset token error', { error: error.message });
    return res.status(500).json({ error: 'Failed to validate token' });
  }
};