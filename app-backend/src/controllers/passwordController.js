// Password controller - handles password reset/change
import User from '../models/User.js';
import hashService from '../services/hashService.js';
import tokenService from '../services/tokenService.js';
import Token from '../models/Token.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';
import { sanitizeClientUrl } from '../utils/validators.js';

const FORGOT_PASSWORD_MSG = 'If that email is registered, a password reset link has been sent.';

// Request forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const clientUrl = sanitizeClientUrl(req.body.clientUrl);

    const user = await User.findByEmail(email);
    if (!user) {
      // Always return the same response to prevent email enumeration
      return res.status(200).json({ message: FORGOT_PASSWORD_MSG });
    }

    // Invalidate any existing reset tokens before creating a new one
    await Token.invalidateUserVerificationTokens(user.id, 'password_reset');

    const resetToken = tokenService.generatePasswordResetToken();
    const expiresAt  = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await Token.createVerificationToken(user.id, resetToken, 'password_reset', expiresAt);

    // Email failure is non-fatal — the token exists but won't be reachable;
    // the next forgot-password request will invalidate it automatically.
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken, clientUrl);
      logger.info({ userId: user.id, reqId: req.id }, 'Password reset email sent');
    } catch (emailError) {
      logger.error({ error: emailError.message, email: user.email, reqId: req.id },
        'Failed to send password reset email');
    }

    return res.status(200).json({ message: FORGOT_PASSWORD_MSG });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Forgot password error');
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

    // Revoke all active refresh tokens so existing sessions are invalidated
    await Token.revokeAllUserTokens(result.user_id);

    logger.info({ userId: result.user_id, reqId: req.id }, 'Password reset successful');
    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Reset password error');
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Validate password reset token (lets the frontend check validity before showing the form)
export const validatePasswordResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await Token.findVerificationToken(token, 'password_reset');
    if (!result) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    return res.status(200).json({ message: 'Password reset token is valid' });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Validate reset token error');
    return res.status(500).json({ error: 'Failed to validate token' });
  }
};