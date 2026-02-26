// backend/src/index.ts

import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// Routes
import authRoutes      from './routes/auth.routes';
import serverRoutes    from './routes/server.routes';
import characterRoutes from './routes/character.routes';
import communityRoutes from './routes/community.routes';  // ← NUEVO

// Middleware
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ───────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate limiting global ──────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS    || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message:  'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// ── Body + cookie parsers ─────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res: Response) => {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    service:   'Trinity CMS API',
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/server',     serverRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/community',  communityRoutes);   // ← NUEVO

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res: Response) => {
  res.status(404).json({
    error:   'Not Found',
    message: 'The requested resource was not found',
    path:    req.path,
  });
});

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});

export default app;