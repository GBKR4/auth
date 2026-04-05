import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import OAuthClient from '../models/OAuthClient.js';
import OAuthAuthCode from '../models/OAuthAuthCode.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { verifyPKCE } from '../utils/pkce.js';
import hashService from '../services/hashService.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWS_DIR = path.join(__dirname, '../views');

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateRawCode = () => crypto.randomBytes(32).toString('hex');

/** Validate client credentials: client_id + client_secret */
const validateClient = async (clientId, clientSecret) => {
  const client = await OAuthClient.findByClientId(clientId);
  if (!client) return null;
  if (!OAuthClient.verifySecret(clientSecret, client.client_secret)) return null;
  return client;
};

// ── GET /oauth/authorize ──────────────────────────────────────────────────────
/**
 * Validate OAuth params and render the login page.
 * SECURITY: Never redirect if client_id or redirect_uri is invalid.
 */
export const authorize = async (req, res) => {
  const { client_id, redirect_uri, response_type, code_challenge, code_challenge_method, state } = req.query;

  // Validate required params
  if (!response_type || response_type !== 'code') {
    return res.status(400).send('Invalid request: response_type must be "code"');
  }
  if (!state) {
    return res.status(400).send('Invalid request: state parameter is required');
  }
  if (!code_challenge || code_challenge_method !== 'S256') {
    return res.status(400).send('Invalid request: PKCE with S256 method is required');
  }
  if (!client_id || !redirect_uri) {
    return res.status(400).send('Invalid request: client_id and redirect_uri are required');
  }

  // Validate client (security: NEVER redirect on invalid client/redirect_uri)
  const client = await OAuthClient.findByClientId(client_id);
  if (!client) {
    logger.warn({ client_id, reqId: req.id }, 'OAuth authorize: unknown client_id');
    return res.status(400).send('Invalid client_id');
  }
  if (!OAuthClient.isValidRedirectUri(client, redirect_uri)) {
    logger.warn({ client_id, redirect_uri, reqId: req.id }, 'OAuth authorize: invalid redirect_uri');
    return res.status(400).send('Invalid redirect_uri');
  }

  logger.info({ client_id, userId: req.user?.id, reqId: req.id }, 'OAuth authorize page served');

  // Render login page — all OAuth params stay in the URL query string.
  // The HTML reads them via window.location.search.
  res.sendFile(path.join(VIEWS_DIR, 'oauth/login.html'));
};

// ── POST /oauth/login ─────────────────────────────────────────────────────────
/**
 * Handle the login form submission during the OAuth flow.
 * On success: generate auth code + redirect to redirect_uri.
 */
export const handleLogin = async (req, res) => {
  const { email, password, client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.body;

  // Detect fetch/JSON mode — JS fetch sends Accept: application/json to avoid
  // the browser's form-action CSP restriction. In this mode we respond with
  // { redirect: url } instead of a 302 so the JS can navigate there itself.
  const wantJson = req.headers['accept']?.includes('application/json');

  const jsonOrRedirect = (url) => {
    if (wantJson) return res.json({ redirect: url });
    return res.redirect(url);
  };

  // Re-validate client params (never trust form input)
  const client = await OAuthClient.findByClientId(client_id);
  if (!client || !OAuthClient.isValidRedirectUri(client, redirect_uri)) {
    if (wantJson) return res.status(400).json({ error: 'Invalid OAuth parameters' });
    return res.status(400).send('Invalid OAuth parameters');
  }
  // Validate email + password
  const user = await User.findByEmail(email);
  if (!user) {
    logger.warn({ email, ip: req.ip, reqId: req.id }, 'OAuth login: user not found');
    return jsonOrRedirect(buildErrorRedirect('Invalid email or password', req.body));
  }

  if (!user.password_hash) {
    return jsonOrRedirect(buildErrorRedirect('This account uses Google login. Please sign in with Google.', req.body));
  }

  const isValid = await hashService.comparePassword(password, user.password_hash);
  if (!isValid) {
    logger.warn({ email, ip: req.ip, reqId: req.id }, 'OAuth login: invalid password');
    return jsonOrRedirect(buildErrorRedirect('Invalid email or password', req.body));
  }

  if (!user.is_verified) {
    return jsonOrRedirect(buildErrorRedirect('Please verify your email before logging in.', req.body));
  }
  if (!user.is_active) {
    return jsonOrRedirect(buildErrorRedirect('This account has been deactivated.', req.body));
  }

  // Generate auth code
  const rawCode = generateRawCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await OAuthAuthCode.create({
    rawCode,
    clientId: client_id,
    userId: user.id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    expiresAt,
  });

  logger.info({ userId: user.id, clientId: client_id, reqId: req.id }, 'OAuth auth code issued');

  // Redirect to client with code (raw code — never expose hash)
  const callbackUrl = new URL(redirect_uri);
  callbackUrl.searchParams.set('code', rawCode);
  callbackUrl.searchParams.set('state', state);
  return jsonOrRedirect(callbackUrl.toString());
};

// ── POST /oauth/token ─────────────────────────────────────────────────────────
/**
 * Exchange an auth code for access + refresh tokens.
 * Validates: client credentials, code, redirect_uri, PKCE.
 */
export const token = async (req, res) => {
  const { client_id, client_secret, code, redirect_uri, code_verifier, grant_type } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  if (!client_id || !client_secret || !code || !redirect_uri || !code_verifier) {
    return res.status(400).json({ error: 'invalid_request', message: 'Missing required parameters' });
  }

  // Validate client credentials
  const client = await validateClient(client_id, client_secret);
  if (!client) {
    logger.warn({ client_id, reqId: req.id }, 'OAuth token: invalid client credentials');
    return res.status(401).json({ error: 'invalid_client' });
  }

  // Find + validate auth code
  const authCode = await OAuthAuthCode.findByCode(code);
  if (!authCode) {
    logger.warn({ client_id, reqId: req.id }, 'OAuth token: invalid or expired code');
    return res.status(400).json({ error: 'invalid_grant', message: 'Authorization code is invalid or expired' });
  }

  // Validate redirect_uri matches what was stored
  if (authCode.redirect_uri !== redirect_uri) {
    logger.warn({ client_id, reqId: req.id }, 'OAuth token: redirect_uri mismatch');
    return res.status(400).json({ error: 'invalid_grant', message: 'redirect_uri mismatch' });
  }

  // Validate client_id matches
  if (authCode.client_id !== client_id) {
    logger.warn({ client_id, reqId: req.id }, 'OAuth token: client_id mismatch');
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // Mark code as USED immediately (single-use — do this before any other checks)
  await OAuthAuthCode.markAsUsed(code);

  // Verify PKCE
  if (!verifyPKCE(code_verifier, authCode.code_challenge)) {
    logger.warn({ client_id, reqId: req.id }, 'OAuth token: PKCE verification failed');
    return res.status(400).json({ error: 'invalid_grant', message: 'PKCE verification failed' });
  }

  // Verify user is still active
  const user = await User.findById(authCode.user_id);
  if (!user || !user.is_active) {
    logger.warn({ userId: authCode.user_id, reqId: req.id }, 'OAuth token: user not found or inactive');
    return res.status(401).json({ error: 'invalid_grant', message: 'User account is not active' });
  }

  // Issue tokens
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await Token.createRefreshToken(user.id, rawRefreshToken, expiresAt);

  await User.updateLastLogin(user.id);

  logger.info({ userId: user.id, client_id, reqId: req.id }, 'OAuth token issued');

  return res.json({
    access_token:  accessToken,
    refresh_token: rawRefreshToken,
    token_type:    'Bearer',
    expires_in:    900, // 15 minutes in seconds
    user: {
      id:              user.id,
      email:           user.email,
      username:        user.username,
      first_name:      user.first_name,
      last_name:       user.last_name,
      role:            user.role,
      profile_picture: user.profile_picture,
    },
  });
};

// ── POST /oauth/refresh ───────────────────────────────────────────────────────
/**
 * Rotate a refresh token — revoke old, issue new access + refresh pair.
 */
export const refresh = async (req, res) => {
  const { client_id, client_secret, refresh_token } = req.body;

  if (!client_id || !client_secret || !refresh_token) {
    return res.status(400).json({ error: 'invalid_request', message: 'Missing required parameters' });
  }

  // Validate client
  const client = await validateClient(client_id, client_secret);
  if (!client) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  // Find + validate refresh token in DB
  const tokenRecord = await Token.findRefreshToken(refresh_token);
  if (!tokenRecord) {
    logger.warn({ client_id, reqId: req.id }, 'OAuth refresh: invalid or revoked refresh token');
    return res.status(401).json({ error: 'invalid_grant', message: 'Refresh token is invalid or expired' });
  }

  // Verify user still active
  const user = await User.findById(tokenRecord.user_id);
  if (!user || !user.is_active) {
    await Token.revokeRefreshToken(refresh_token);
    return res.status(401).json({ error: 'invalid_grant', message: 'User account is not active' });
  }

  // Rotate: revoke old, issue new pair
  await Token.revokeRefreshToken(refresh_token);

  const newAccessToken = jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
  const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Token.createRefreshToken(user.id, newRawRefreshToken, expiresAt);

  logger.info({ userId: user.id, client_id, reqId: req.id }, 'OAuth token refreshed');

  return res.json({
    access_token:  newAccessToken,
    refresh_token: newRawRefreshToken,
    token_type:    'Bearer',
    expires_in:    900,
  });
};

// ── GET /oauth/userinfo ───────────────────────────────────────────────────────
/**
 * Return the authenticated user's profile.
 * Protected by authenticateToken middleware.
 */
export const userinfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      id:              user.id,
      email:           user.email,
      username:        user.username,
      first_name:      user.first_name,
      last_name:       user.last_name,
      role:            user.role,
      profile_picture: user.profile_picture,
      is_verified:     user.is_verified,
    });
  } catch (err) {
    logger.error({ error: err.message, reqId: req.id }, 'OAuth userinfo error');
    return res.status(500).json({ error: 'server_error' });
  }
};

// ── POST /oauth/revoke ────────────────────────────────────────────────────────
/**
 * Revoke a refresh token (client-authenticated logout).
 */
export const revoke = async (req, res) => {
  const { client_id, client_secret, refresh_token } = req.body;

  if (!client_id || !client_secret) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const client = await validateClient(client_id, client_secret);
  if (!client) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  if (refresh_token) {
    await Token.revokeRefreshToken(refresh_token);
    logger.info({ client_id, reqId: req.id }, 'OAuth refresh token revoked');
  }

  return res.json({ message: 'Token revoked' });
};

// ── Internal helpers ──────────────────────────────────────────────────────────

// Build the error redirect URL (returns a string, doesn't send the response).
// Used by both the classic redirect path and the fetch/JSON path.
function buildErrorRedirect(error, body) {
  const params = new URLSearchParams({
    client_id:             body.client_id || '',
    redirect_uri:          body.redirect_uri || '',
    state:                 body.state || '',
    code_challenge:        body.code_challenge || '',
    code_challenge_method: body.code_challenge_method || 'S256',
    response_type:         'code',
    error:                 error,
  });
  return `/oauth/authorize?${params.toString()}`;
}

// Legacy wrapper — kept for any callers that still use the old signature.
function redirectToLoginWithError(res, error, body) {
  return res.redirect(buildErrorRedirect(error, body));
}


// ── GET /oauth/register ────────────────────────────────────────────────────────
/** Serves the user-facing registration page (not developer-branded). */
export const registerPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'oauth/register.html'));
};

export default { authorize, registerPage, handleLogin, token, refresh, userinfo, revoke };
