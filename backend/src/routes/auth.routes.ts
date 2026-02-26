// backend/src/routes/auth.routes.ts

import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import authService from '../services/auth.service';
import { validate } from '../middleware/validation.middleware';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ==================== VALIDATION RULES ====================

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage('Username must be between 3 and 16 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Username must contain only letters and numbers'),
  body('password')
    .isLength({ min: 6, max: 16 })
    .withMessage('Password must be between 6 and 16 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ==================== ROUTES ====================

/**
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post('/register', validate(registerValidation), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, email } = req.body;
    const result = await authService.register({ username, password, email });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ [AUTH ROUTES] Register error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post('/login', validate(loginValidation), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
      || req.headers['x-real-ip'] as string
      || req.socket.remoteAddress
      || 'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    console.log('🔐 [AUTH ROUTES] Login attempt:', { username, ipAddress, userAgent });

    const result = await authService.login(username, password, ipAddress);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    // Refresh token en httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/api/auth',
    });

    // CAMBIO: result.user ahora incluye permissions (viene de auth.service)
    res.status(200).json({
      success:     true,
      message:     result.message,
      token:       result.accessToken,   // legacy
      accessToken: result.accessToken,
      user:        result.user,          // { id, username, email, permissions[] }
    });
  } catch (error) {
    console.error('❌ [AUTH ROUTES] Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @access  Public (requiere refreshToken en cookie)
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    console.log('🔄 [AUTH] Refresh attempt:', {
      hasCookie: !!req.cookies?.refreshToken,
      cookies:   Object.keys(req.cookies || {}),
    });

    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token not provided' });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result.success) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      res.status(401).json(result);
      return;
    }

    res.status(200).json({
      success:     true,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error('❌ [AUTH ROUTES] Refresh error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ [AUTH ROUTES] Logout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
router.post('/logout-all', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    await authService.logoutAll(req.user.id);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(200).json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    console.error('❌ [AUTH ROUTES] Logout all error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   GET /api/auth/me
 * @access  Private
 *
 * CAMBIO: ahora devuelve { user: { id, username, email, permissions[] } }
 * en lugar de { account: {...} } — el frontend espera `user`, no `account`.
 * Los permissions se consultan frescos desde rbac_account_permissions.
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    // getAccount ahora incluye permissions (ver auth.service.ts)
    const account = await authService.getAccount(req.user.id);

    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {                         // ← clave `user` (no `account`)
        id:          account.id,
        username:    account.username,
        email:       account.email,
        permissions: account.permissions ?? [],
      },
    });
  } catch (error) {
    console.error('❌ [AUTH ROUTES] Get me error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token (legacy endpoint)
 * @access  Public
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: 'Token is required' });
      return;
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    // CAMBIO: decoded ahora incluye permissions
    res.status(200).json({ success: true, user: decoded });
  } catch (error) {
    console.error('❌ [AUTH ROUTES] Verify error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;