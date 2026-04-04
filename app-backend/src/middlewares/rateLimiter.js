// Rate limiting middleware
import rateLimit from 'express-rate-limit';

// ── Standard 429 response ─────────────────────────────────────────────────────
const makeHandler = (message) => (_req, res) =>
  res.status(429).json({ error: message });

// ── Global fallback ───────────────────────────────────────────────────────────
// Applied to ALL routes as a baseline.  Tighter limiters below override this
// for sensitive endpoints.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,    // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  handler: makeHandler('Too many requests. Please try again later.'),
});

// ── Registration — 10 per 15 min ──────────────────────────────────────────────
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many registration attempts. Please try again later.'),
});

// ── Login — 20 per 15 min; only counts failures ───────────────────────────────
// skipSuccessfulRequests: true means a correct password doesn't burn the quota,
// so legitimate users are never locked out by their own activity.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many failed login attempts. Please try again later.'),
});

// ── Password reset — 5 per 15 min ─────────────────────────────────────────────
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many password reset requests. Please try again later.'),
});

// ── Resend verification email — 5 per 15 min ──────────────────────────────────
export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many verification email requests. Please try again later.'),
});

// ── OAuth code exchange — 10 per 15 min ───────────────────────────────────────
// Short-lived one-time codes; tight limit to prevent enumeration attacks.
export const oauthExchangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many OAuth attempts. Please try again later.'),
});