// Token service - JWT generation/validation
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { 
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' 
  });
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
}

export const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
}

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');   
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateVerificationToken,
  generatePasswordResetToken,
  hashToken
};