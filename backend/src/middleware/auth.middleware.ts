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

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 [AUTH MIDDLEWARE] Verificando autenticación...');
    console.log('🔐 [AUTH MIDDLEWARE] Header:', authHeader ? 'Presente' : 'Ausente');
    console.log('🔐 [AUTH MIDDLEWARE] Token:', token ? 'Presente' : 'Ausente');

    if (!token) {
      console.log('❌ [AUTH MIDDLEWARE] No se proporcionó token');
      res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      console.log('✅ [AUTH MIDDLEWARE] Token válido para usuario:', decoded.username);
      
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email
      };
      
      next();
    } catch (jwtError: any) {
      console.error('❌ [AUTH MIDDLEWARE] Token inválido:', jwtError.message);
      res.status(403).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
      return;
    }
  } catch (error) {
    console.error('❌ [AUTH MIDDLEWARE] Error en middleware:', error);
    res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

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
        req.user = {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email
        };
      } catch (error) {
        // Token inválido, pero es opcional así que continuamos sin user
      }
    }

    next();
  } catch (error) {
    next();
  }
};