// Token model
import { getPool } from '../config/database.js';
import crypto from 'crypto';

// Hash a token before storing/querying — raw token never touches the DB
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ── Refresh Tokens ────────────────────────────────────────────────────────────

export const createRefreshToken = async (userId, token, expiresAt) => {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *`,
    [userId, hashToken(token), expiresAt]
  );
  return result.rows[0];
};

export const findRefreshToken = async (token) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token = $1 AND is_revoked = false AND expires_at > NOW()`,
    [hashToken(token)]
  );
  return result.rows[0] ?? null;
};

export const revokeRefreshToken = async (token) => {
  const pool = getPool();
  await pool.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE token = $1`,
    [hashToken(token)]
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

// ── Verification Tokens (email_verification, password_reset, oauth_code) ──────

export const createVerificationToken = async (userId, token, tokenType, expiresAt) => {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO verification_tokens (user_id, token, token_type, expires_at) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, hashToken(token), tokenType, expiresAt]
  );
  return result.rows[0];
};

export const findVerificationToken = async (token, tokenType) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM verification_tokens
     WHERE token = $1 AND token_type = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [hashToken(token), tokenType]
  );
  return result.rows[0] ?? null;
};

export const markTokenAsUsed = async (token) => {
  const pool = getPool();
  await pool.query(
    `UPDATE verification_tokens SET used_at = NOW() WHERE token = $1`,
    [hashToken(token)]
  );
  return true;
};

export const invalidateUserVerificationTokens = async (userId, tokenType) => {
  const pool = getPool();
  await pool.query(
    `UPDATE verification_tokens SET used_at = NOW()
     WHERE user_id = $1 AND token_type = $2 AND used_at IS NULL`,
    [userId, tokenType]
  );
  return true;
};

// ── OAuth one-time code ───────────────────────────────────────────────────────
// A short-lived (5 min) single-use code that maps to a userId.
// The frontend exchanges it for real JWT tokens via POST /api/auth/google/exchange.

export const createOAuthCode = async (userId, code, expiresAt) => {
  return createVerificationToken(userId, code, 'oauth_code', expiresAt);
};

// ── Cleanup ───────────────────────────────────────────────────────────────────
// Called by the background interval in server.js every 6 hours.

export const deleteExpiredTokens = async () => {
  const pool = getPool();
  await pool.query(`DELETE FROM refresh_tokens      WHERE expires_at < NOW()`);
  await pool.query(`DELETE FROM verification_tokens WHERE expires_at < NOW()`);
  // Keep login_attempts for 30 days for audit/monitoring; purge older rows
  await pool.query(
    `DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days'`
  );
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
  invalidateUserVerificationTokens,
  createOAuthCode,
  deleteExpiredTokens,
};
