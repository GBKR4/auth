// Authentication middleware - JWT verification
import jwt from 'jsonwebtoken';
import '../config.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  };

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  if(!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = decoded;
  next();
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
