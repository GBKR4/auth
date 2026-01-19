// Password controller - handles password reset/change
import pool from '../config/db.js';
import User from '../models/User.js';
import hashService from '../services/hashService.js';
import tokenService from '../services/tokenService.js';
import Token from '../models/Token.js';
import emailService from '../services/emailService.js';

// Request forgot password 
export const forgotPassword = async (req, res) => {
  const email = req.body.email;

  const user = await User.findByEmail(email);
  if (!user) {
    return true;
  }

  const resetToken = tokenService.generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
  const verificationToken = await Token.verificationToken(user.id, resetToken, 'password_reset', expiresAt);
  await emailService.sendPasswordResetEmail(user.email, resetToken);
  return res.status(200).json({ message: 'Password reset email sent' });
};

// Reset password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await Token.findVerificationToken(token, 'password_reset');
  if( !result ) {
    return res.status(400).json({ error: 'Invalid or expired password reset token' });
  };

  const newHashedPassword = await hashService.hashPassword(newPassword);
  await User.updateById(result.user_id, { password_hash: newHashedPassword });
  await Token.markTokenAsUsed(token);
  return res.status(200).json({ message: 'Password has been reset successfully' });
};

// validate password reset token
export const validatePasswordResetToken = async (req, res) => {
  const { token } = req.body;

  const result = await Token.findVerificationToken(token, 'password_reset');
  if (!result) {
    return res.status(400).json({ error: 'Invalid or expired password reset token' });
  }

  return res.status(200).json({ message: 'Password reset token is valid' });
};