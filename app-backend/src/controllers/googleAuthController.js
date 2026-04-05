import * as tokenService from '../services/tokenService.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import OAuthClient from '../models/OAuthClient.js';
import OAuthAuthCode from '../models/OAuthAuthCode.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

// ── Origin allowlist helper ───────────────────────────────────────────────────
// Used to validate the `state` redirect parameter and prevent open-redirect attacks.
const getAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL);
  return [...new Set(list)];
};

const isAllowedOrigin = (url) => {
  try {
    const { origin } = new URL(url);
    return getAllowedOrigins().includes(origin);
  } catch {
    return false;
  }
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared cookie helpers ─────────────────────────────────────────────────────
const isProd = () => process.env.NODE_ENV === 'production';
const authCookieOpts = () => ({
  httpOnly: true,
  secure:   isProd(),
  sameSite: isProd() ? 'none' : 'lax',
  path:     '/',
});
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Google OAuth callback handler.
 *
 * Security: tokens are NOT put in the redirect URL (they would appear in logs,
 * browser history, and Referer headers). Instead we issue a short-lived
 * one-time code (5 min, single-use) and redirect with only that code.
 * The frontend exchanges the code via POST /api/auth/google/exchange.
 */
export const googleAuthCallback = async (req, res) => {
  // Parse the Passport state param — contains mode + relevant data
  let stateData = { mode: 'direct' };
  let redirectBase = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    if (req.query.state) {
      stateData = JSON.parse(decodeURIComponent(req.query.state));
    }
  } catch {
    logger.warn({ reqId: req.id }, 'Google OAuth: failed to parse state param');
  }

  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${redirectBase}/login?error=auth_failed`);
    }

    await User.updateLastLogin(user.id);

    // ── Mode: OAuth provider flow ─────────────────────────────────────────────
    // Google was initiated from the OAuth authorize page (/oauth/authorize).
    // Instead of setting cookies, issue an auth code and redirect to the client.
    if (stateData.mode === 'oauth' && stateData.oauthParams) {
      const oauthParams = new URLSearchParams(stateData.oauthParams);
      const clientId    = oauthParams.get('client_id');
      const redirectUri = oauthParams.get('redirect_uri');
      const state       = oauthParams.get('state');
      const codeChallenge = oauthParams.get('code_challenge');

      // Validate client + redirect_uri
      const client = await OAuthClient.findByClientId(clientId);
      if (!client || !OAuthClient.isValidRedirectUri(client, redirectUri)) {
        logger.warn({ clientId, redirectUri, reqId: req.id }, 'Google OAuth flow: invalid client or redirect_uri');
        return res.status(400).send('Invalid OAuth client configuration');
      }

      // Generate auth code
      const rawCode  = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await OAuthAuthCode.create({ rawCode, clientId, userId: user.id, redirectUri, codeChallenge, expiresAt });

      logger.info({ userId: user.id, clientId, reqId: req.id }, 'Google OAuth: auth code issued for OAuth flow');

      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', rawCode);
      callbackUrl.searchParams.set('state', state);
      return res.redirect(callbackUrl.toString());
    }

    // ── Mode: Direct Google login (existing behaviour) ────────────────────────
    // Resolve safe redirect base
    if (stateData.mode === 'direct' && stateData.redirectUrl) {
      if (isAllowedOrigin(stateData.redirectUrl)) {
        redirectBase = stateData.redirectUrl;
      }
    } else if (req.query.state) {
      // Legacy: state was just a URL string
      const decoded = decodeURIComponent(req.query.state);
      if (isAllowedOrigin(decoded)) redirectBase = decoded;
    }

    // Issue one-time OAuth code for exchange
    const oauthCode = tokenService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await Token.createOAuthCode(user.id, oauthCode, expiresAt);

    logger.info({ userId: user.id, reqId: req.id }, 'Google OAuth code issued (direct login)');
    return res.redirect(`${redirectBase}/auth/google/callback?code=${oauthCode}`);

  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Google auth callback error');
    return res.redirect(`${redirectBase}/login?error=server_error`);
  }
};

/**
 * Exchange a one-time OAuth code for JWT access + refresh tokens.
 * POST /api/auth/google/exchange  { code: string }
 */
export const googleAuthExchange = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'OAuth code is required' });
    }

    // Find and consume the one-time code
    const tokenRecord = await Token.findVerificationToken(code, 'oauth_code');
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired OAuth code' });
    }

    const user = await User.findById(tokenRecord.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Mark code as consumed immediately (prevent replay)
    await Token.markTokenAsUsed(code);

    // Issue real JWT tokens
    const accessToken  = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Token.createRefreshToken(user.id, refreshToken, expiresAt);

    logger.info({ userId: user.id, reqId: req.id }, 'Google OAuth exchange successful');

    const opts = authCookieOpts();
    return res
      .cookie('accessToken',  accessToken,  { ...opts, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        message:      'OAuth login successful',
        accessToken,
        refreshToken,
        user: {
          id:       user.id,
          email:    user.email,
          username: user.username,
          role:     user.role,
        },
      });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Google auth exchange error');
    return res.status(500).json({ error: 'Failed to complete OAuth login' });
  }
};

// Google authentication failure handler
export const googleAuthFailure = (req, res) => {
  let redirectBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (req.query.state) {
    const decoded = decodeURIComponent(req.query.state);
    if (isAllowedOrigin(decoded)) redirectBase = decoded;
  }
  return res.redirect(`${redirectBase}/login?error=google_auth_failed`);
};

export default {
  googleAuthCallback,
  googleAuthExchange,
  googleAuthFailure,
};