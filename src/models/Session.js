// Session model
import { getPool } from '../config/database.js';

export const createSession = async (userId, sessionToken, userAgent, ipAddress, expiresAt) => {
  const pool = getPool();
  const result = await pool.query(
    "INSERT INTO sessions (user_id, session_token, user_agent, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [userId, sessionToken, userAgent, ipAddress, expiresAt]
  );
  return result.rows[0];
};

export const findByToken = async (sessionToken) => {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM sessions WHERE session_token = $1 AND revoked = false", [sessionToken]);
  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

export const findByUserId = async (userId) => {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM sessions WHERE user_id = $1 AND revoked = false", [userId]);

  if( result.rows.length === 0) {
    return [];
  }
  return result.rows;
};

export const updateActivity = async (sessionToken) => {
  const pool = getPool();
  const result = await pool.query("UPDATE sessions SET last_activity_at = NOW() WHERE session_token = $1 RETURNING *", [sessionToken]);
  return result.rows[0];
};

export const deleteSession = async (sessionToken) => {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);
  if (result.rows.length === 0) {
    return false;
  }
  await pool.query("DELETE FROM sessions WHERE session_token = $1", [sessionToken]);
  return true;
};

export const deleteExpiredSessions = async () => {
  const pool = getPool();
  await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
};

export default {
  createSession,
  findByToken,
  findByUserId,
  updateActivity,
  deleteSession,
  deleteExpiredSessions
};