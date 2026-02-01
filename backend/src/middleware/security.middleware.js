// src/middleware/security.middleware.js

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// CRITICAL: Custom WAF Middleware
const customWAF = (req, res, next) => {
    // 1. SQL Injection patterns
    const sqlPatterns = [
        /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
        /(--|\#|\/\*|\*\/)/g,
        /(\bOR\b.*=.*)/gi,
        /(\bAND\b.*=.*)/gi
    ];

    // 2. XSS patterns
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi
    ];

    // 3. Path Traversal
    const pathTraversalPatterns = [
        /\.\.\//g,
        /\.\.\\/g,
        /%2e%2e%2f/gi,
        /%2e%2e\\/gi
    ];

    // Validar todos los inputs
    const checkInput = (input) => {
        if (typeof input === 'string') {
            // SQL Injection
            for (let pattern of sqlPatterns) {
                if (pattern.test(input)) {
                    return { blocked: true, reason: 'SQL Injection attempt' };
                }
            }
            
            // XSS
            for (let pattern of xssPatterns) {
                if (pattern.test(input)) {
                    return { blocked: true, reason: 'XSS attempt' };
                }
            }
            
            // Path Traversal
            for (let pattern of pathTraversalPatterns) {
                if (pattern.test(input)) {
                    return { blocked: true, reason: 'Path Traversal attempt' };
                }
            }
        }
        return { blocked: false };
    };

    // Escanear body, query, params
    const scanObject = (obj) => {
        for (let key in obj) {
            const result = checkInput(obj[key]);
            if (result.blocked) {
                // Log del ataque
                console.error('🚨 [WAF] BLOCKED:', {
                    ip: req.ip,
                    reason: result.reason,
                    input: obj[key],
                    endpoint: req.path,
                    timestamp: new Date().toISOString()
                });
                
                // Retornar error genérico (no revelar razón al atacante)
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request'
                });
            }
        }
    };

    if (req.body) scanObject(req.body);
    if (req.query) scanObject(req.query);
    if (req.params) scanObject(req.params);

    next();
};

// Rate limiting por endpoint
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { success: false, message },
        standardHeaders: true,
        legacyHeaders: false,
        // Store en Redis para entornos distribuidos (futuro)
        // store: new RedisStore({ client: redisClient })
    });
};

// Slow down (throttling progresivo)
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutos
    delayAfter: 50, // Permitir 50 requests normales
    delayMs: 500 // Añadir 500ms de delay por cada request adicional
});

module.exports = {
    // Helmet con configuración estricta
    helmetConfig: helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
                fontSrc: ["'self'", "fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:", "wow.zamimg.com"],
                scriptSrc: ["'self'"],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }),

    // WAF personalizado
    customWAF,

    // Sanitizers
    mongoSanitize: mongoSanitize(),
    xssClean: xss(),

    // Rate limiters por endpoint
    rateLimiters: {
        global: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'),
        auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts'),
        register: createRateLimiter(60 * 60 * 1000, 3, 'Too many registration attempts'),
        shop: createRateLimiter(15 * 60 * 1000, 30, 'Too many shop requests'),
        payment: createRateLimiter(60 * 60 * 1000, 10, 'Too many payment attempts')
    },

    speedLimiter
};