// backend/src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

/**
 * Middleware de autenticación con soporte para refresh automático
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 [AUTH MIDDLEWARE] Verificando autenticación...');

    if (!token) {
      console.log('❌ [AUTH MIDDLEWARE] No se proporcionó token');
      res.status(401).json({ 
        success: false,
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
      return;
    }

    try {
      // Verificar token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Verificar que sea un access token
      if (decoded.type !== 'access') {
        console.error('❌ [AUTH MIDDLEWARE] Token type inválido:', decoded.type);
        res.status(403).json({ 
          success: false,
          message: 'Invalid token type',
          code: 'INVALID_TOKEN_TYPE'
        });
        return;
      }

      console.log('✅ [AUTH MIDDLEWARE] Token válido para usuario:', decoded.username);
      
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email
      };
      
      next();
    } catch (jwtError: any) {
      console.error('❌ [AUTH MIDDLEWARE] Error verificando token:', jwtError.message);
      
      // Identificar tipo de error
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({ 
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }

      if (jwtError.name === 'JsonWebTokenError') {
        res.status(403).json({ 
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        return;
      }

      // Error genérico
      res.status(403).json({ 
        success: false,
        message: 'Token verification failed',
        code: 'VERIFICATION_FAILED'
      });
    }
  } catch (error) {
    console.error('❌ [AUTH MIDDLEWARE] Error inesperado:', error);
    res.status(500).json({ 
      success: false,
      message: 'Authentication error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Middleware de autenticación opcional (no bloquea si no hay token)
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        if (decoded.type === 'access') {
          req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email
          };
        }
      } catch (error) {
        // Token inválido pero es opcional, continuamos sin user
        console.log('⚠️ [AUTH MIDDLEWARE] Token opcional inválido, continuando sin user');
      }
    }

    next();
  } catch (error) {
    // En caso de error, continuamos sin autenticación
    next();
  }
};

/**
 * Middleware para verificar roles (admin, GM, etc.)
 * TODO: Implementar cuando agregues sistema de roles
 */
export const requireRole = (requiredRole: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
      return;
    }

    // TODO: Consultar rol del usuario en DB
    // Por ahora, placeholder
    console.log('⚠️ [AUTH MIDDLEWARE] Role check not implemented yet');
    next();
  };
};