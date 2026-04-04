import { getPool } from '../config/database.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import tokenService from '../services/tokenService.js';
import hashService from '../services/hashService.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// ── Shared cookie helpers ─────────────────────────────────────────────────────
// In development (HTTP) we use lax/non-secure cookies to avoid the browser
// requirement that sameSite=none must be paired with Secure.
// In production (HTTPS) we use sameSite=none + secure so that cookies can be
// shared across different domains (multi-project auth).
const isProd = () => process.env.NODE_ENV === 'production';

const authCookieOpts = () => ({
  httpOnly: true,
  secure:   isProd(),
  sameSite: isProd() ? 'none' : 'lax',
  path:     '/',
});
// ─────────────────────────────────────────────────────────────────────────────

// Register new user
export const register = async (req, res) => {
  try {
    const { email, username, password, first_name, last_name, clientUrl } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const password_hash = await hashService.hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      username,
      password_hash,
      first_name,
      last_name,
    });

    // Generate verification token
    const verificationToken = tokenService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await Token.createVerificationToken(
      user.id,
      verificationToken,
      'email_verification',
      expiresAt
    );

    // Send verification email — non-fatal if delivery fails
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken, clientUrl);
    } catch (emailError) {
      logger.error({ error: emailError.message, email: user.email, reqId: req.id },
        'Email sending failed (registration succeeded)');
    }

    logger.info({ email, username, userId: user.id, reqId: req.id }, 'User registered');

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    logger.error({ error: error.message, email: req.body.email, reqId: req.id }, 'Registration failed');
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const pool = getPool();

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      logger.warn({ email, ip: req.ip, reqId: req.id }, 'Failed login — user not found');
      await pool.query(
        'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, false)',
        [email, req.ip]
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // ── Account lockout check ────────────────────────────────────────────────
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);
    const attemptsResult = await pool.query(
      `SELECT COUNT(*) AS count, MAX(attempted_at) AS last_attempt
       FROM login_attempts
       WHERE email = $1 AND success = false AND attempted_at > $2`,
      [email, windowStart]
    );
    const failedCount = parseInt(attemptsResult.rows[0].count, 10);
    const lastAttempt = attemptsResult.rows[0].last_attempt;
    if (failedCount >= MAX_FAILED_ATTEMPTS && lastAttempt) {
      const msSinceLast = Date.now() - new Date(lastAttempt).getTime();
      if (msSinceLast < LOCKOUT_DURATION_MS) {
        const waitSec = Math.ceil((LOCKOUT_DURATION_MS - msSinceLast) / 1000);
        logger.warn({ email, ip: req.ip, waitSec, reqId: req.id }, 'Account temporarily locked');
        return res.status(429).json({
          error: `Too many failed login attempts. Try again in ${waitSec} seconds.`,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Check if account uses Google OAuth (no password set)
    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account was created with Google. Please sign in with Google.' });
    }

    // Verify password
    const isValidPassword = await hashService.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      logger.warn({ email, ip: req.ip, reqId: req.id }, 'Failed login — invalid password');
      await pool.query(
        'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, false)',
        [email, req.ip]
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await Token.createRefreshToken(user.id, refreshToken, expiresAt);

    // Update last login + record success
    await User.updateLastLogin(user.id);
    await pool.query(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, true)',
      [email, req.ip]
    );

    logger.info({ userId: user.id, email: user.email, ip: req.ip, reqId: req.id }, 'User logged in');

    const opts = authCookieOpts();
    res
      .cookie('accessToken',  accessToken,  { ...opts, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        message: 'Login successful',
        // Also sent in payload for cross-domain clients where cookies are blocked
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
    logger.error({ error: error.message, email: req.body.email, reqId: req.id }, 'Login failed');
    res.status(500).json({ error: 'Login failed' });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await Token.revokeRefreshToken(refreshToken);
    }

    logger.info({ reqId: req.id }, 'User logged out');

    const opts = authCookieOpts();
    res
      .clearCookie('accessToken',  opts)
      .clearCookie('refreshToken', opts)
      .json({ message: 'Logout successful' });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Logout error');
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Refresh access token (rotates refresh token to prevent replay attacks)
export const refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token signature
    const decoded = tokenService.verifyRefreshToken(oldRefreshToken);

    // Check token exists in DB and is not revoked
    const tokenRecord = await Token.findRefreshToken(oldRefreshToken);
    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Verify user is still active
    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) {
      await Token.revokeRefreshToken(oldRefreshToken);
      return res.status(401).json({ error: 'Account no longer active' });
    }

    // Rotate: revoke old, issue new pair
    await Token.revokeRefreshToken(oldRefreshToken);
    const newAccessToken  = tokenService.generateAccessToken(user);
    const newRefreshToken = tokenService.generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Token.createRefreshToken(user.id, newRefreshToken, expiresAt);

    const opts = authCookieOpts();
    res
      .cookie('accessToken',  newAccessToken,  { ...opts, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', newRefreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        message:      'Token refreshed',
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Refresh token error');
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const tokenRecord = await Token.findVerificationToken(token, 'email_verification');
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await User.markAsVerified(tokenRecord.user_id);
    await Token.markTokenAsUsed(token);

    res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Verify email error');
    res.status(500).json({ error: 'Email verification failed' });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email, clientUrl } = req.body;

    // Generic message prevents email enumeration
    const GENERIC_MSG = 'If that email is registered and unverified, a new verification email has been sent.';

    const user = await User.findByEmail(email);
    if (!user || user.is_verified) {
      return res.status(200).json({ message: GENERIC_MSG });
    }

    // Invalidate all pending tokens before issuing a new one
    await Token.invalidateUserVerificationTokens(user.id, 'email_verification');

    const verificationToken = tokenService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await Token.createVerificationToken(user.id, verificationToken, 'email_verification', expiresAt);

    try {
      await emailService.sendVerificationEmail(user.email, verificationToken, clientUrl);
    } catch (emailError) {
      logger.error({ error: emailError.message, email: user.email, reqId: req.id },
        'Failed to send verification email (resend)');
    }

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    logger.error({ error: error.message, reqId: req.id }, 'Resend verification error');
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};
