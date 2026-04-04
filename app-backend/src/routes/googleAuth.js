import { Router } from 'express';
import passport from '../config/passport.js';
import { googleAuthCallback, googleAuthFailure } from '../controllers/googleAuthController.js';

const router = Router();

// Initiates Google OAuth flow
router.get(
  '/google',
  (req, res, next) => {
    // State helps remember which project requested the login
    const state = req.query.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: encodeURIComponent(state)
    })(req, res, next);
  }
);

// Google OAuth callback route
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/api/auth/google/failure',
    session: false 
  }),
  googleAuthCallback
);

// Google auth failure route
router.get('/google/failure', googleAuthFailure);

export default router;