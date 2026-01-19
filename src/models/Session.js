// Session model
import pool from '../config/db.js';

export const createSession = async (userId, userAgent, ipAddress, userAgent, expiresAt) => {
  const result = await pool.query("SELECT * FROM sessions WHERE user_id = $1 AND user_agent = $2 AND ip_address = $3 AND revoked = false", [userId, userAgent, ipAddress]);

  if( result.rows.length == 0){
    return 
  }
};

export const findByToken = async (sessionToken) => {
  const result = await pool.query("SELECT * FROM sessions WHERE session_token = $1 AND revoked = false", [sessionToken]);
  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

export const findByUserId = async (userId) => {
  const result = await pool.query("SELECT * FROM sessions WHERE user_id = $1 AND revoked = false", [userId]);

  if( result.rows.length === 0) {
    return [];
  }
  return result.rows;
};

export const updateActivity = async (sessionToken) => {
  const result = await pool.query("UPDATE sessions SET last_activity_at = NOW() WHERE session_token = $1 RETURNING *", [sessionToken]);
  return result.rows[0];
};

export const deleteSession = async (sessionToken) => {
  const result = await pool.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);
  if (result.rows.length === 0) {
    return false;
  }
  await pool.query("DELETE FROM sessions WHERE session_token = $1", [sessionToken]);
  return true;
};

export const deleteExpiredSessions = async () => {
  await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
};