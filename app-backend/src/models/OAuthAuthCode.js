import { getPool } from '../config/database.js';
import { hashToken } from '../utils/pkce.js';

/**
 * OAuthAuthCode Model
 * Stores one-time authorization codes for the OAuth 2.0 Authorization Code flow.
 * Raw codes are NEVER stored — only SHA-256 hashes.
 * Each code expires in 5 minutes and can only be used once.
 */

/**
 * Create a new auth code
 * @param {object} params
 * @param {string} params.rawCode        - Raw code (will be hashed before storage)
 * @param {string} params.clientId       - OAuth client_id
 * @param {number} params.userId         - Authenticated user's ID
 * @param {string} params.redirectUri    - The redirect_uri sent in the authorize request
 * @param {string} params.codeChallenge  - PKCE S256 code_challenge
 * @param {Date}   params.expiresAt      - Expiry timestamp (5 minutes from now)
 */
export const create = async ({ rawCode, clientId, userId, redirectUri, codeChallenge, expiresAt }) => {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO oauth_auth_codes (code, client_id, user_id, redirect_uri, code_challenge, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [hashToken(rawCode), clientId, userId, redirectUri, codeChallenge, expiresAt]
  );
  return result.rows[0];
};

/**
 * Find a valid (unused, unexpired) auth code by raw code value.
 * @param {string} rawCode
 * @returns {object|null}
 */
export const findByCode = async (rawCode) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM oauth_auth_codes
     WHERE code = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [hashToken(rawCode)]
  );
  return result.rows[0] ?? null;
};

/**
 * Mark an auth code as used (single-use enforcement).
 * Called IMMEDIATELY when the code is presented at the token endpoint.
 * @param {string} rawCode
 */
export const markAsUsed = async (rawCode) => {
  const pool = getPool();
  await pool.query(
    `UPDATE oauth_auth_codes SET used_at = NOW() WHERE code = $1`,
    [hashToken(rawCode)]
  );
};

/**
 * Delete all expired auth codes (called by cleanup job every 6 hours).
 */
export const deleteExpired = async () => {
  const pool = getPool();
  const result = await pool.query(
    `DELETE FROM oauth_auth_codes WHERE expires_at < NOW()`
  );
  return result.rowCount;
};

export default { create, findByCode, markAsUsed, deleteExpired };
