// backend/src/middleware/security.middleware.ts
//
// WAF + seguridad centralizada del CMS.
// Convierte el security.middleware.js (CommonJS) a TypeScript ESM.
//
// Dependencias requeridas (ya en package.json):
//   - helmet          ✅
//   - express-rate-limit ✅
//
// Dependencias opcionales (instalar si quieres slowDown):
//   npm install express-slow-down
//   npm install --save-dev @types/express-slow-down

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// ═══════════════════════════════════════════════════════════
// 1. HELMET — Headers HTTP de seguridad
// ═══════════════════════════════════════════════════════════
//
// Reemplaza el app.use(helmet()) genérico de index.ts.
// Esta configuración es más estricta y adaptada al CMS WoW.

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com'],
      // wow.zamimg.com → iconos de items WoW (wowhead/wotlkdb)
      imgSrc:      ["'self'", 'data:', 'https:', 'wow.zamimg.com'],
      scriptSrc:   ["'self'"],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
  // HSTS: fuerza HTTPS por 1 año en producción
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  // Evita que el browser sniffee el content-type
  noSniff: true,
  // Desactiva X-Powered-By: Express
  hidePoweredBy: true,
  // Clickjacking protection
  frameguard: { action: 'deny' },
});

// ═══════════════════════════════════════════════════════════
// 2. WAF PERSONALIZADO — Detección de patrones maliciosos
// ═══════════════════════════════════════════════════════════
//
// Capa de defensa L7 a nivel de aplicación.
// IMPORTANTE: No bloquea contenido del foro/noticias que
// legítimamente puede contener HTML — solo escanea
// parámetros de query, params de ruta y body de formularios.
//
// El contenido HTML de posts (news, devblog) se sanitiza
// en el servicio con sanitize-html, no aquí.

// Patrones SQL Injection — keywords críticos en contexto sospechoso
const SQL_PATTERNS = [
  /(\bUNION\b\s+\bSELECT\b)/gi,
  /(\bDROP\b\s+\bTABLE\b)/gi,
  /(\bINSERT\b\s+\bINTO\b)/gi,
  /(\bDELETE\b\s+\bFROM\b)/gi,
  /(\bEXEC\b|\bEXECUTE\b)\s*\(/gi,
  /(--|#|\/\*|\*\/)\s*$/gm,         // comentarios SQL al final de línea
  /'\s*(OR|AND)\s+'?\d+'?\s*=\s*'?\d+/gi,  // ' OR '1'='1
];

// Patrones XSS
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["']?[^"'>]*/gi,    // onclick=, onerror=, etc.
  /<iframe\b/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
];

// Path traversal
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[/\\]/g,
  /%2e%2e[%2f%5c]/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
];

type CheckResult = { blocked: false } | { blocked: true; reason: string };

function checkInput(input: string): CheckResult {
  for (const pattern of SQL_PATTERNS) {
    pattern.lastIndex = 0; // reset para flags globales
    if (pattern.test(input)) return { blocked: true, reason: 'SQL Injection attempt' };
  }
  for (const pattern of XSS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) return { blocked: true, reason: 'XSS attempt' };
  }
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) return { blocked: true, reason: 'Path Traversal attempt' };
  }
  return { blocked: false };
}

function scanObject(
  obj: Record<string, unknown>,
  req: Request,
  res: Response,
): boolean {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      const result = checkInput(val);
      if (result.blocked) {
        console.error('🚨 [WAF] BLOCKED:', {
          ip:        req.ip,
          reason:    result.reason,
          field:     key,
          endpoint:  req.path,
          method:    req.method,
          timestamp: new Date().toISOString(),
        });
        res.status(400).json({ success: false, message: 'Invalid request' });
        return true; // bloqueado
      }
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Recursivo para objetos anidados en body
      if (scanObject(val as Record<string, unknown>, req, res)) return true;
    }
  }
  return false;
}

export const customWAF = (req: Request, res: Response, next: NextFunction): void => {
  // No escanear rutas de health check o assets estáticos
  if (req.path === '/health') return next();

  const blocked =
    (req.body   && typeof req.body   === 'object' && scanObject(req.body,   req, res)) ||
    (req.query  && typeof req.query  === 'object' && scanObject(req.query as Record<string, unknown>,  req, res)) ||
    (req.params && typeof req.params === 'object' && scanObject(req.params, req, res));

  if (!blocked) next();
};

// ═══════════════════════════════════════════════════════════
// 3. RATE LIMITERS por endpoint
// ═══════════════════════════════════════════════════════════
//
// Uso en rutas específicas:
//   import { rateLimiters } from '../middleware/security.middleware';
//   router.post('/login', rateLimiters.auth, handler);

const createLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    message:         { success: false, message },
    standardHeaders: true,
    legacyHeaders:   false,
    // Para entornos distribuidos con Redis, descomentar:
    // store: new RedisStore({ client: redisClient }),
  });

export const rateLimiters = {
  // Global — montado en /api en index.ts
  global: createLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS    || '900000'), // 15 min
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    'Too many requests from this IP, please try again later.'
  ),

  // Auth — login/register (más estricto)
  auth: createLimiter(
    15 * 60 * 1000, // 15 min
    parseInt(process.env.RATE_LIMIT_AUTH || '10'),
    'Too many login attempts. Try again in 15 minutes.'
  ),

  // Register — aún más estricto
  register: createLimiter(
    60 * 60 * 1000, // 1 hora
    parseInt(process.env.RATE_LIMIT_REGISTER || '5'),
    'Too many registration attempts. Try again in 1 hour.'
  ),

  // Posts del foro / creación de contenido
  post: createLimiter(
    10 * 60 * 1000, // 10 min
    parseInt(process.env.RATE_LIMIT_POST || '10'),
    'Too many posts. Please wait before posting again.'
  ),

  // Shop / pagos
  shop: createLimiter(
    15 * 60 * 1000,
    parseInt(process.env.RATE_LIMIT_SHOP || '30'),
    'Too many shop requests.'
  ),

  payment: createLimiter(
    60 * 60 * 1000,
    parseInt(process.env.RATE_LIMIT_PAYMENT || '10'),
    'Too many payment attempts.'
  ),
};