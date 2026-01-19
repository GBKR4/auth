// User model
import { getPool } from '../config/database.js';

export const findById = async (id) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

  if(result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
}

export const findByEmail = async (email) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

  if(result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
};

export const findByUsername = async (username) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

  if(result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
};

export const create = async (user) => {
  const pool = getPool();
  const { email, username, password_hash, first_name, last_name, role } = user;
  const result = await pool.query(
    `INSERT INTO users (email, username, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email, username, password_hash, first_name, last_name, role || 'user']
  );
  return result.rows[0];
};

export const updateById = async (id, updates) => {
  const pool = getPool();
  const fields = [];
  const values = [];
  let index = 1;
  for (const key in updates) {
    fields.push(`${key} = $${index}`);
    values.push(updates[key]);
    index++;
  }
  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const deleteById = async (id) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

  if(result.rowCount === 0) {
    return false;
  }

  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return true;
};

export const markAsVerified = async (id) => {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

  if(result.rowCount === 0) {
    return null;
  }

  await pool.query("UPDATE users SET is_verified = true WHERE id = $1", [id]);
};

export const updateLastLogin  = async (id) => {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

  if(result.rowCount === 0) {
    return null;
  }

  await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [id]);
};

export default {
  findById,
  findByEmail,
  findByUsername,
  create,
  updateById,
  deleteById,
  markAsVerified,
  updateLastLogin,
};