import { Router } from 'express';
import passport from '../config/passport.js';
import { googleAuthCallback, googleAuthFailure, googleAuthExchange } from '../controllers/googleAuthController.js';

// ── Allowed-origin guard ──────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// Initiates Google OAuth flow
router.get(
  '/google',
  (req, res, next) => {
    // `redirectUrl` tells us where to send the user after auth.
    // Validate it before encoding it into the state param.
    const requestedRedirect = req.query.redirectUrl;
    const state = (requestedRedirect && isSafeRedirectUrl(requestedRedirect))
      ? requestedRedirect
      : (process.env.FRONTEND_URL || 'http://localhost:5173');

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: encodeURIComponent(state),
    })(req, res, next);
  }
);

// Google OAuth callback route
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: false,
  }),
  googleAuthCallback
);

// Exchange a one-time OAuth code for JWT tokens
// The frontend calls this after receiving the code in the redirect query param.
router.post('/google/exchange', googleAuthExchange);

// Google auth failure route
router.get('/google/failure', googleAuthFailure);

export default router;