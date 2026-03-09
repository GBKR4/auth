import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Token from '../models/Token.js';
import tokenService from '../services/tokenService.js';
import hashService from '../services/hashService.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Register new user
export const register = async (req, res) => {
  try {
    const { email, username, password, first_name, last_name } = req.body;

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

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      logger.error('Email sending failed (but registration succeeded)', { 
        error: emailError.message, 
        email: user.email 
      });
      // Continue registration even if email fails
    }

    logger.info('User registered', { email, username, userId: user.id });

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    logger.error('Registration failed', { error: error.message, email: req.body.email });
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      logger.warn('Failed login attempt - user not found', { email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if account uses Google OAuth (no password set)
    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account was created with Google. Please sign in with Google.' });
    }

    // Verify password
    const isValidPassword = await hashService.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      logger.warn('Failed login attempt - invalid password', { email, ip: req.ip });
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

    // Update last login
    await User.updateLastLogin(user.id);

    logger.info('User logged in', { userId: user.id, email: user.email, ip: req.ip });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' };

    res
      .cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      });
  } catch (error) {
    logger.error('Login failed', { error: error.message, email: req.body.email });
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

    logger.info('User logged out');

    res
      .clearCookie('accessToken', { path: '/' })
      .clearCookie('refreshToken', { path: '/' })
      .json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Refresh access token (rotates refresh token to prevent replay attacks)
export const refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = tokenService.verifyRefreshToken(oldRefreshToken);

    // Check if token exists in database and not revoked
    const tokenRecord = await Token.findRefreshToken(oldRefreshToken);
    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Rotate: revoke old token, issue new pair
    await Token.revokeRefreshToken(oldRefreshToken);
    const newAccessToken = tokenService.generateAccessToken(user);
    const newRefreshToken = tokenService.generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Token.createRefreshToken(user.id, newRefreshToken, expiresAt);

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' };

    res
      .cookie('accessToken', newAccessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', newRefreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ message: 'Token refreshed' });
  } catch (error) {
    logger.error('Refresh token error', { error: error.message });
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find verification token
    const tokenRecord = await Token.findVerificationToken(token, 'email_verification');
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Mark user as verified
    await User.markAsVerified(tokenRecord.user_id);

    // Mark token as used
    await Token.markTokenAsUsed(token);

    res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already verified
    if (user.is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = tokenService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await Token.createVerificationToken(
      user.id,
      verificationToken,
      'email_verification',
      expiresAt
    );

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};
