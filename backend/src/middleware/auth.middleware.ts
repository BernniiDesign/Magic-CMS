// backend/src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    permissions: number[];   // ← NUEVO: array de permissionIds
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided', code: 'NO_TOKEN' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      if (decoded.type !== 'access') {
        res.status(403).json({ success: false, message: 'Invalid token type', code: 'INVALID_TOKEN_TYPE' });
        return;
      }

      req.user = {
        id:          decoded.id,
        username:    decoded.username,
        email:       decoded.email,
        permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],  // ← NUEVO
      };

      next();

    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      }
      res.status(403).json({ success: false, message: 'Invalid token', code: 'INVALID_TOKEN' });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'Authentication error', code: 'SERVER_ERROR' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.type === 'access') {
          req.user = {
            id:          decoded.id,
            username:    decoded.username,
            email:       decoded.email,
            permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
          };
        }
      } catch {
        // token inválido pero es opcional — continuamos sin user
      }
    }
    next();
  } catch {
    next();
  }
};