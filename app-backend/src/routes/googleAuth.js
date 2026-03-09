import { Router } from 'express';
import passport from '../config/passport.js';
import { googleAuthCallback, googleAuthFailure } from '../controllers/googleAuthController.js';

const router = Router();

// Initiates Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
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