// Load environment variables first
import { configDotenv } from 'dotenv';
configDotenv();
import passport from './config/passport.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: function (origin, callback) {
    // Allows ANY domain to communicate with this auth backend (for multi-project support)
    // For extreme security, replace this with an array `[ 'http://app1.com', 'http://app2.com' ]`
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(passport.initialize());
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;