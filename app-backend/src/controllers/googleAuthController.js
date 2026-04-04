import * as tokenService from '../services/tokenService.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import logger from '../utils/logger.js';

// Google OAuth callback handler
export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    
    // Decode state parameter to figure out the originating project's callback URL
    let redirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.query.state) {
      redirectUrl = decodeURIComponent(req.query.state);
    }
    
    if (!user) {
      return res.redirect(`${redirectUrl}/login?error=auth_failed`);
    }

    // Generate JWT tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    // Save refresh token to database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await Token.createRefreshToken(user.id, refreshToken, expiresAt);

    // Update last login
    await User.updateLastLogin(user.id);

    // Set tokens as cross-domain cookies
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = { httpOnly: true, secure: true, sameSite: 'none', path: '/' };

    // Redirect to the requesting app with tokens in URL
    return res
      .cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .redirect(`${redirectUrl}/auth/google/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);

  } catch (error) {
    let redirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.query.state) redirectUrl = decodeURIComponent(req.query.state);
    
    logger.error('Google auth callback error', { error: error.message });
    return res.redirect(`${redirectUrl}/login?error=server_error`);
  }
};

// Google authentication failure handler
export const googleAuthFailure = (req, res) => {
  let redirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (req.query.state) redirectUrl = decodeURIComponent(req.query.state);
  return res.redirect(`${redirectUrl}/login?error=google_auth_failed`);
};

export default {
  googleAuthCallback,
  googleAuthFailure
};