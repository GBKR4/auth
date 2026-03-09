// Authentication middleware - JWT verification
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const authenticateToken = (req, res, next) => {
  // Prefer httpOnly cookie; fall back to Authorization header for non-browser clients
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    logger.warn('Missing token', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}; 

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

export default {
  authenticateToken,
  authorizeRoles
};