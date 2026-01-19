// User controller - handles user profile management
import pool from '../config/database.js';
import User from '../models/User.js';
import hashService from '../services/hashService.js';

// Get user profile
export const getUserProfile = async (req, res) => {
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
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  const userId = req.user.id;
  
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

  if(result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { first_name, last_name } = req.body;
  const updatedUser = await User.updateById(userId, { first_name, last_name });
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
};

// change user password
export const changeUserPassword = async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if(result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { currentPassword, newPassword } = req.body;
  const user = result.rows[0];
  if(!await hashService.comparePassword(currentPassword, user.password_hash)){
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const newHashedPassword = await hashService.hashPassword(newPassword);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHashedPassword, userId]);
  return res.status(200).json({ message: 'Password updated successfully' });
};

// Delete user account
export const deleteUserAccount = async (req, res) => {
  const userId = req.user.id;
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

  if(result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  return res.status(200).json({ message: 'User account deleted successfully' });
};

// getAllUsers - for admin
export const getAllUsers = async (req, res) => {
  const result = await pool.query('SELECT id, email, username, first_name, last_name, role, is_verified, created_at, updated_at FROM users');

  return res.status(200).json(result.rows);
}; 