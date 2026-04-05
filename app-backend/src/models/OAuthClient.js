import { getPool } from '../config/database.js';
import crypto from 'crypto';

/**
 * OAuthClient Model
 * Handles all DB operations for registered OAuth client applications.
 * Client secrets are ALWAYS stored as SHA-256 hashes — never raw.
 */

const hashSecret = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

/**
 * Create a new OAuth client
 */
export const create = async ({ clientId, rawSecret, name, redirectUris, developerId }) => {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris, developer_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, client_id, name, redirect_uris, developer_id, created_at`,
    [clientId, hashSecret(rawSecret), name, redirectUris, developerId]
  );
  return result.rows[0];
};

/**
 * Find client by client_id
 */
export const findByClientId = async (clientId) => {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM oauth_clients WHERE client_id = $1',
    [clientId]
  );
  return result.rows[0] ?? null;
};

/**
 * Find all clients owned by a developer
 */
export const findByDeveloperId = async (developerId) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, client_id, name, redirect_uris, developer_id, created_at
     FROM oauth_clients WHERE developer_id = $1 ORDER BY created_at DESC`,
    [developerId]
  );
  return result.rows;
};

/**
 * Find a single client owned by a developer (ownership check)
 */
export const findByIdAndDeveloper = async (id, developerId) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM oauth_clients WHERE id = $1 AND developer_id = $2`,
    [id, developerId]
  );
  return result.rows[0] ?? null;
};

/**
 * Verify a raw client secret against the stored hash
 */
export const verifySecret = (rawSecret, storedHash) => {
  return hashSecret(rawSecret) === storedHash;
};

/**
 * Update (rotate) client secret — stores new hash
 */
export const updateSecret = async (id, newRawSecret) => {
  const pool = getPool();
  await pool.query(
    'UPDATE oauth_clients SET client_secret = $1 WHERE id = $2',
    [hashSecret(newRawSecret), id]
  );
};

/**
 * Update redirect URIs
 */
export const updateRedirectUris = async (id, redirectUris) => {
  const pool = getPool();
  await pool.query(
    'UPDATE oauth_clients SET redirect_uris = $1 WHERE id = $2',
    [redirectUris, id]
  );
};

/**
 * Delete a client by id
 */
export const deleteById = async (id) => {
  const pool = getPool();
  await pool.query('DELETE FROM oauth_clients WHERE id = $1', [id]);
};

/**
 * Check if a redirect URI is in the client's whitelist
 */
export const isValidRedirectUri = (client, redirectUri) => {
  return client.redirect_uris.includes(redirectUri);
};

export default {
  create,
  findByClientId,
  findByDeveloperId,
  findByIdAndDeveloper,
  verifySecret,
  updateSecret,
  updateRedirectUris,
  deleteById,
  isValidRedirectUri,
};
