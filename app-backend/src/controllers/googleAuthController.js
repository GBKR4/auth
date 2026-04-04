import * as tokenService from '../services/tokenService.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import logger from '../utils/logger.js';

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
  // Resolve redirect base — validated against the allowlist
  let redirectBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (req.query.state) {
    const decoded = decodeURIComponent(req.query.state);
    if (isAllowedOrigin(decoded)) {
      redirectBase = decoded;
    } else {
      logger.warn({ state: decoded, reqId: req.id }, 'Google OAuth: rejected unallowed state redirect');
      // Fall back to the env default — do not honour the untrusted URL
    }
  }

  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${redirectBase}/login?error=auth_failed`);
    }

    // Generate a one-time short-lived code — NO tokens ever touch the URL
    const oauthCode = tokenService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await Token.createOAuthCode(user.id, oauthCode, expiresAt);

    await User.updateLastLogin(user.id);

    logger.info({ userId: user.id, reqId: req.id }, 'Google OAuth code issued');

    // Redirect with only the short-lived code — frontend exchanges it
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