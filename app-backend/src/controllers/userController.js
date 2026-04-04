// User controller - handles user profile management
import { getPool } from '../config/database.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import hashService from '../services/hashService.js';
import logger from '../utils/logger.js';

// ── Shared cookie helpers (mirrors authController) ────────────────────────────
const isProd = () => process.env.NODE_ENV === 'production';
const authCookieOpts = () => ({
  httpOnly: true,
  secure:   isProd(),
  sameSite: isProd() ? 'none' : 'lax',
  path:     '/',
});
// ─────────────────────────────────────────────────────────────────────────────

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const pool   = getPool();
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, is_verified,
              profile_picture, auth_provider, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error({ error: error.message, userId: req.user?.id, reqId: req.id }, 'Get profile error');
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, username } = req.body;
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name  !== undefined) updates.last_name  = last_name;

    // Username update with uniqueness check
    if (username !== undefined) {
      const existing = await User.findByUsername(username);
      if (existing && existing.id !== userId) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      updates.username = username;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await User.updateById(userId, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id:              updatedUser.id,
      email:           updatedUser.email,
      username:        updatedUser.username,
      first_name:      updatedUser.first_name,
      last_name:       updatedUser.last_name,
      role:            updatedUser.role,
      is_verified:     updatedUser.is_verified,
      profile_picture: updatedUser.profile_picture,
      created_at:      updatedUser.created_at,
      updated_at:      updatedUser.updated_at,
    });
  } catch (error) {
    logger.error({ error: error.message, userId: req.user?.id, reqId: req.id }, 'Update profile error');
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change user password
export const changeUserPassword = async (req, res) => {
  try {
    const pool   = getPool();
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

    // Revoke all refresh tokens — forces re-login on other devices
    await Token.revokeAllUserTokens(userId);

    logger.info({ userId, reqId: req.id }, 'Password changed');
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error({ error: error.message, userId: req.user?.id, reqId: req.id }, 'Change password error');
    return res.status(500).json({ error: 'Failed to change password' });
  }
};

// Delete user account
export const deleteUserAccount = async (req, res) => {
  try {
    const pool   = getPool();
    const userId = req.user.id;
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Token.revokeAllUserTokens(userId);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    logger.info({ userId, reqId: req.id }, 'User account deleted');

    const opts = authCookieOpts();
    res
      .clearCookie('accessToken',  opts)
      .clearCookie('refreshToken', opts)
      .json({ message: 'User account deleted successfully' });
  } catch (error) {
    logger.error({ error: error.message, userId: req.user?.id, reqId: req.id }, 'Delete account error');
    return res.status(500).json({ error: 'Failed to delete account' });
  }
};

// Get all users — admin only, paginated
export const getAllUsers = async (req, res) => {
  try {
    const pool  = getPool();
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [usersResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, email, username, first_name, last_name, role, is_verified,
                auth_provider, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) AS total FROM users'),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    return res.status(200).json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Get all users error');
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};