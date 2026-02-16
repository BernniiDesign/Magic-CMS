// backend/src/middleware/scraping-limiter.middleware.ts

import rateLimit from 'express-rate-limit';

// ✅ Exportar para usar en rutas
export const scrapingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { 
    success: false, 
    message: 'Too many enchantment resolution requests. Please try again later.' 
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});