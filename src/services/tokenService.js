// Token service - JWT generation/validation
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import '../config.js';

export const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = async (user) => {
  return jwt.sign({id: user.id, type: user.type}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  try {
    if(decoded) {
      return decoded;
    }
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  try {
    if(decoded) {
      return decoded;
    }
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
  return crypto.createHash('sha256').
    update(token).digest('hex');   
}