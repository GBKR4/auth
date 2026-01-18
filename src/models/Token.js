// Token model
import pool from '../config/db.js';

export const createRefreshToken = async (userId, token, type, expiresAt) => {
  const result = await pool.query(
    `INSERT INTO tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, token, type, expiresAt]
  );
  return result.rows[0];
};

export const findRefreshToken = async (token) => {
  const result = await pool.query(
    `SELECT * FROM tokens WHERE token = $1 AND type = 'refresh' AND revoked = false`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
};

export const revokeRefreshToken = async (token) => {
  const result = await pool.query("SELECT * FROM tokens WHERE token = $1 AND type = 'refresh' AND revoked = false", [token]);

  if (result.rows.length === 0) {
    return false;
  }

  await pool.query(
    `UPDATE tokens SET is_revoked = true WHERE token = $1 AND type = 'refresh'`,
    [token]
  );

  return true;
};

export const verificationToken = async (userId, token, tokenType, expiresAt) => {
  const result = await pool.query(
    `INSERT INTO tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, token, tokenType, expiresAt]
  );
  return result.rows[0];
}

export const findVerificationToken = async (token, tokenType) => {
  const result = await pool.query("SELECT * FROM tokens WHERE token = $1 AND type = $2 AND revoked = false", [token, tokenType]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

export const markTokenAsUsed = async (token) => {
  const result = await pool.query("SELECT * FROM tokens WHERE token = $1", [token]);

  if (result.rows.length === 0) {
    return false;
  }

  await pool.query(
    `UPDATE tokens SET used_at = NOW() WHERE token = $1`, [token]
  );

  return true;
};

export const deleteExpiredTokens = async () => {
  await pool.query("DELETE FROM tokens WHERE expires_at < NOW() OR (used_at IS NOT NULL)", []);
};