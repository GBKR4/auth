// User controller - handles user profile management
import { getPool } from '../config/database.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import hashService from '../services/hashService.js';
import logger from '../utils/logger.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    const user = await pool.query('SELECT id, email, username, first_name, last_name, role, is_verified, created_at, updated_at FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.rows[0].id,
      email: user.rows[0].email,
      username: user.rows[0].username,
      first_name: user.rows[0].first_name,
      last_name: user.rows[0].last_name,
      role: user.rows[0].role,
      is_verified: user.rows[0].is_verified,
      created_at: user.rows[0].created_at,
      updated_at: user.rows[0].updated_at
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name } = req.body;
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const updatedUser = await User.updateById(userId, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      role: updatedUser.role,
      is_verified: updatedUser.is_verified,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// change user password
export const changeUserPassword = async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Google OAuth accounts have no password
    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Password cannot be changed here.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!await hashService.comparePassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Prevent setting the same password
    if (await hashService.comparePassword(newPassword, user.password_hash)) {
      return res.status(400).json({ error: 'New password must be different from the current password' });
    }

    const newHashedPassword = await hashService.hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHashedPassword, userId]);
    logger.info('Password changed', { userId });
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Change password error', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to change password' });
  }
};

// Delete user account
export const deleteUserAccount = async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Revoke all refresh tokens before deleting (DB cascade handles the rows,
    // but cookies may still be alive — clearing them here invalidates the session)
    await Token.revokeAllUserTokens(userId);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    logger.info('User account deleted', { userId });

    const isProd = process.env.NODE_ENV === 'production';
    res
      .clearCookie('accessToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' })
      .clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' })
      .json({ message: 'User account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to delete account' });
  }
};

// getAllUsers - for admin
export const getAllUsers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT id, email, username, first_name, last_name, role, is_verified, created_at, updated_at FROM users');
    return res.status(200).json(result.rows);
  } catch (error) {
    logger.error('Get all users error', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};