// Request correlation ID middleware
// Attaches a unique ID to every request so logs across the same request can be traced.
import { randomUUID } from 'crypto';

export const requestId = (req, res, next) => {
  // Honour an ID already set by an upstream proxy (e.g. Nginx, Cloudflare)
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};

export default requestId;
