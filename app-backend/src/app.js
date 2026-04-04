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
    // Allow requests with no origin (curl, server-to-server, mobile clients)
    if (!origin || allowed.includes(origin)) {
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
// This is a pure JSON API — no HTML rendering — so a strict CSP is safe.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc:  ["'none'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // not needed for API-only server
}));
// ─────────────────────────────────────────────────────────────────────────────

app.use(requestId);                                   // attach X-Request-Id
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(passport.initialize());
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;