import * as tokenService from '../services/tokenService.js';
import User from '../models/User.js';
import Token from '../models/Token.js';

// Google OAuth callback handler
export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Generate JWT tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    // Save refresh token to database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await Token.createRefreshToken(user.id, refreshToken, expiresAt);

    // Update last login
    await User.updateLastLogin(user.id);

    // Set tokens as httpOnly cookies — not readable by JS, not exposed in URL/logs
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' };

    return res
      .cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .redirect(`${process.env.FRONTEND_URL}/auth/google/callback`);

  } catch (error) {
    console.error('Google auth callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

// Google authentication failure handler
export const googleAuthFailure = (req, res) => {
  return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
};

export default {
  googleAuthCallback,
  googleAuthFailure
};