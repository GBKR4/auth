// Token model
import { getPool } from '../config/database.js';

// Refresh Tokens
export const createRefreshToken = async (userId, token, expiresAt) => {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *`,
    [userId, token, expiresAt]
  );
  return result.rows[0];
};

export const findRefreshToken = async (token) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token = $1 AND is_revoked = false`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
};

export const revokeRefreshToken = async (token) => {
  const pool = getPool();
  await pool.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE token = $1`,
    [token]
  );
  return true;
};

export const revokeAllUserTokens = async (userId) => {
  const pool = getPool();
  await pool.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1`,
    [userId]
  );
  return true;
};

// Verification Tokens
export const createVerificationToken = async (userId, token, tokenType, expiresAt) => {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO verification_tokens (user_id, token, token_type, expires_at) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, token, tokenType, expiresAt]
  );
  return result.rows[0];
};

export const findVerificationToken = async (token, tokenType) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM verification_tokens WHERE token = $1 AND token_type = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [token, tokenType]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
};

export const markTokenAsUsed = async (token) => {
  const pool = getPool();
  await pool.query(
    `UPDATE verification_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );
  return true;
};

export const deleteExpiredTokens = async () => {
  const pool = getPool();
  await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
  await pool.query('DELETE FROM verification_tokens WHERE expires_at < NOW()');
  return true;
};

export default {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  createVerificationToken,
  findVerificationToken,
  markTokenAsUsed,
  deleteExpiredTokens,
};
