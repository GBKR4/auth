import { Router } from 'express';
import passport from '../config/passport.js';
import { googleAuthCallback, googleAuthFailure, googleAuthExchange } from '../controllers/googleAuthController.js';
import { oauthExchangeLimiter } from '../middlewares/rateLimiter.js';

// ── Allowed-origin guard ───────────────────────────────────────────────────────
const getAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL);
  return [...new Set(list)];
};

const isSafeRedirectUrl = (url) => {
  try {
    const { origin } = new URL(url);
    return getAllowedOrigins().includes(origin);
  } catch {
    return false;
  }
};

const router = Router();

/**
 * Initiates Google OAuth flow.
 *
 * Two modes:
 * 1. Direct login (existing): ?redirectUrl=<frontend>
 *    After auth: sets cookies + redirects to frontend.
 *
 * 2. OAuth provider flow (new): ?oauthState=<encoded OAuth params>
 *    After auth: generates auth code + redirects to client redirect_uri.
 *    oauthState contains: client_id, redirect_uri, state, code_challenge.
 */
router.get(
  '/google',
  (req, res, next) => {
    let passportState;

    if (req.query.oauthState) {
      // OAuth provider flow
      passportState = JSON.stringify({
        mode: 'oauth',
        oauthParams: req.query.oauthState,
      });
    } else {
      // Direct login flow
      const requestedRedirect = req.query.redirectUrl;
      const redirectUrl = (requestedRedirect && isSafeRedirectUrl(requestedRedirect))
        ? requestedRedirect
        : (process.env.FRONTEND_URL || 'http://localhost:5173');
      passportState = JSON.stringify({ mode: 'direct', redirectUrl });
    }

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: encodeURIComponent(passportState),
    })(req, res, next);
  }
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: false,
  }),
  googleAuthCallback
);

// Exchange one-time code for tokens (direct Google login only)
router.post('/google/exchange', oauthExchangeLimiter, googleAuthExchange);

// Failure handler
router.get('/google/failure', googleAuthFailure);

export default router;