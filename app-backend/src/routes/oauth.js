import { Router } from 'express';
import * as oauthController from '../controllers/oauthController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// Authorization endpoint — validate params + render login page
router.get('/authorize', oauthController.authorize);

// Registration page — for new users coming from OAuth login screen
router.get('/register', oauthController.registerPage);

// Login form submission during OAuth flow
router.post('/login', oauthController.handleLogin);

// Token endpoint — exchange auth code for tokens
router.post('/token', oauthController.token);

// Refresh token endpoint — rotate tokens
router.post('/refresh', oauthController.refresh);

// Userinfo endpoint — returns user profile (requires valid access token)
router.get('/userinfo', authenticateToken, oauthController.userinfo);

// Revoke endpoint — revoke a refresh token (logout)
router.post('/revoke', oauthController.revoke);

export default router;
