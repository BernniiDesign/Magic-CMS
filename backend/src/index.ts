// backend/src/index.ts

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// ── Seguridad — importar ANTES de montar rutas ────────────────
import {
  helmetConfig,
  customWAF,
  rateLimiters,
} from './middleware/security.middleware';

// ── Rutas ─────────────────────────────────────────────────────
import authRoutes      from './routes/auth.routes';
import serverRoutes    from './routes/server.routes';
import characterRoutes from './routes/character.routes';
import communityRoutes from './routes/community.routes';

// ── Error handler ─────────────────────────────────────────────
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE — orden crítico, no reordenar
// ═══════════════════════════════════════════════════════════

// 1. Helmet — headers HTTP de seguridad (reemplaza el helmet() genérico)
app.use(helmetConfig);

// 2. CORS — antes del WAF para que los preflight OPTIONS pasen
app.use(cors({
  origin:      process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Body parsers — deben correr ANTES del WAF para que req.body exista
app.use(express.json({ limit: '2mb' }));          // limita payload máximo
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// 4. WAF personalizado — escanea body/query/params tras parsear
app.use(customWAF);

// 5. Rate limiting global sobre /api
app.use('/api', rateLimiters.global);

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK — fuera del rate limit global
// ═══════════════════════════════════════════════════════════

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    service:   'Trinity CMS API',
    env:       process.env.NODE_ENV || 'development',
  });
});

// ═══════════════════════════════════════════════════════════
// API ROUTES
// Rate limiters específicos se aplican por módulo aquí.
// Los rate limiters de auth/register se aplican dentro de
// auth.routes.ts usando rateLimiters.auth / rateLimiters.register
// importados directamente, para mayor granularidad.
// ═══════════════════════════════════════════════════════════

app.use('/api/auth',       authRoutes);
app.use('/api/server',     serverRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/community',  communityRoutes);

// ═══════════════════════════════════════════════════════════
// 404 + ERROR HANDLERS — siempre al final
// ═══════════════════════════════════════════════════════════

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error:   'Not Found',
    message: 'The requested resource does not exist',
  });
});

app.use(errorHandler);

// ═══════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  WAF: active`);
  console.log(`🌐 CORS: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});

export default app;