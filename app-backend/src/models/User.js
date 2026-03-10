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
  const { email, username, password_hash, first_name, last_name, role, google_id, auth_provider, profile_picture, is_verified } = user;
  
  // Build dynamic query based on provided fields
  const fields = ['email', 'username'];
  const values = [email, username];
  let paramCount = 2;
  
  if (password_hash !== undefined) {
    fields.push('password_hash');
    values.push(password_hash);
    paramCount++;
  }
  
  if (first_name) {
    fields.push('first_name');
    values.push(first_name);
    paramCount++;
  }
  
  if (last_name) {
    fields.push('last_name');
    values.push(last_name);
    paramCount++;
  }
  
  fields.push('role');
  values.push(role || 'user');
  paramCount++;
  
  if (google_id) {
    fields.push('google_id');
    values.push(google_id);
    paramCount++;
  }
  
  if (auth_provider) {
    fields.push('auth_provider');
    values.push(auth_provider);
    paramCount++;
  }
  
  if (profile_picture) {
    fields.push('profile_picture');
    values.push(profile_picture);
    paramCount++;
  }
  
  if (is_verified !== undefined) {
    fields.push('is_verified');
    values.push(is_verified);
    paramCount++;
  }
  
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const query = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Whitelist of columns that are safe to update via this function
const UPDATABLE_COLUMNS = new Set([
  'first_name', 'last_name', 'password_hash', 'is_verified',
  'is_active', 'role', 'google_id', 'auth_provider', 'profile_picture', 'last_login',
]);

export const updateById = async (id, updates) => {
  const pool = getPool();
  const fields = [];
  const values = [];
  let index = 1;
  for (const key in updates) {
    if (!UPDATABLE_COLUMNS.has(key)) {
      throw new Error(`Column '${key}' is not allowed in updateById`);
    }
    fields.push(`${key} = $${index}`);
    values.push(updates[key]);
    index++;
  }
  if (fields.length === 0) return null;
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
  const result = await pool.query(
    'UPDATE users SET is_verified = true WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] ?? null;
};

export const updateLastLogin = async (id) => {
  const pool = getPool();
  const result = await pool.query(
    'UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] ?? null;
};

export const findByGoogleId = async (googleId) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  if(result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
};

export default {
  findById,
  findByEmail,
  findByUsername,
  findByGoogleId,
  create,
  updateById,
  deleteById,
  markAsVerified,
  updateLastLogin,
};