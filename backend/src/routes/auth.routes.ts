import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import authService from '../services/auth.service';
import { validate } from '../middleware/validation.middleware';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Validation rules
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
    .normalizeEmail()
];

const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * @route   POST /api/auth/register
 * @desc    Register a new account
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
    console.error('Register route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login to account
 * @access  Public
 */
router.post('/login', validate(loginValidation), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const result = await authService.login({ username, password });

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
      return;
    }

    const account = await authService.getAccount(req.user.accountId);

    if (!account) {
      res.status(404).json({ 
        success: false, 
        message: 'Account not found' 
      });
      return;
    }

    res.status(200).json({ 
      success: true, 
      account 
    });
  } catch (error) {
    console.error('Get me route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token
 * @access  Public
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
      return;
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
      return;
    }

    res.status(200).json({ 
      success: true, 
      user: decoded 
    });
  } catch (error) {
    console.error('Verify route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;
