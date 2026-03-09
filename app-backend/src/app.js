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
app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;