// Load environment variables first
import { configDotenv } from 'dotenv';
configDotenv();
import passport from './config/passport.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { requestId } from './middlewares/requestId.js';
import routes from './routes/index.js';
import developerRouter from './routes/developer.js';
import oauthRouter from './routes/oauth.js';
import OAuthAuthCode from './models/OAuthAuthCode.js';
import logger from './utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Build the allowed-origins set from ALLOWED_ORIGINS (comma-separated) and
// FRONTEND_URL. Both env vars are read at request time so restarts aren't
// needed if the env changes in containerised environments.
const getAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL);
  return [...new Set(list)];
};

app.use(cors({
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();
    // Allow:
    //  · No origin at all  → curl / mobile clients
    //  · 'null' string     → Node.js built-in fetch (undici) for server-to-server calls
    //  · Listed origins    → browser clients on known domains
    if (!origin || origin === 'null' || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));
// ─────────────────────────────────────────────────────────────────────────────

// ── Security headers (Helmet) ─────────────────────────────────────────────────
// The auth service now serves HTML pages (developer portal, OAuth login).
// CSP is relaxed to allow inline scripts for those pages and Google Fonts.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'"],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
      // Explicitly allow form submissions to self — required for the OAuth login
      // and developer portal HTML forms (Helmet v8 may not inherit this default
      // when custom directives are provided).
      formAction:  ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// ─────────────────────────────────────────────────────────────────────────────

app.use(requestId);                                   // attach X-Request-Id
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(passport.initialize());

// ── Static files for HTML pages (developer portal, OAuth login) ──────────────
app.use(express.static(join(__dirname, 'views')));

// ── Auth HTML page routes ─────────────────────────────────────────────────────
// Serve the forgot-password and reset-password HTML forms directly from the
// auth server so the frontend doesn't need to handle these flows at all.
app.get('/forgot-password', (_req, res) =>
  res.sendFile(join(__dirname, 'views', 'forgot-password.html'))
);
app.get('/reset-password/:token', (_req, res) =>
  res.sendFile(join(__dirname, 'views', 'reset-password.html'))
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);                              // REST API
app.use('/api/developer', developerRouter);           // Developer Portal API
app.use('/developer', developerRouter);               // Developer Portal UI
app.use('/oauth', oauthRouter);                       // OAuth 2.0 Authorization Server

// ── Cleanup job: remove expired OAuth auth codes every 6 hours ───────────────
const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const deleted = await OAuthAuthCode.deleteExpired();
    if (deleted > 0) logger.info({ deleted }, 'Cleaned up expired OAuth auth codes');
  } catch (err) {
    logger.error({ error: err.message }, 'Failed to clean up expired OAuth auth codes');
  }
}, SIX_HOURS);

app.use(notFound);
app.use(errorHandler);

export default app;