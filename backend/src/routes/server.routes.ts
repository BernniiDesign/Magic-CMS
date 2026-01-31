import { Router, Request, Response } from 'express';
import serverService from '../services/server.service';
import { optionalAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/server/status
 * @desc    Get realm status
 * @access  Public
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const realms = await serverService.getRealmStatus();

    res.status(200).json({
      success: true,
      realms
    });
  } catch (error) {
    console.error('Get realm status route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching realm status'
    });
  }
});

/**
 * @route   GET /api/server/stats
 * @desc    Get server statistics
 * @access  Public
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await serverService.getServerStats();

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get server stats route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching server statistics'
    });
  }
});

/**
 * @route   GET /api/server/online
 * @desc    Get online characters
 * @access  Public
 */
router.get('/online', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const characters = await serverService.getOnlineCharacters(limit);

    res.status(200).json({
      success: true,
      characters,
      count: characters.length
    });
  } catch (error) {
    console.error('Get online characters route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching online characters'
    });
  }
});

/**
 * @route   GET /api/server/info
 * @desc    Get server information
 * @access  Public
 */
router.get('/info', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      server: {
        name: process.env.SERVER_NAME || 'My WoW Server',
        version: process.env.SERVER_VERSION || '3.3.5a',
        rates: {
          xp: parseInt(process.env.SERVER_RATES_XP || '1'),
          gold: parseInt(process.env.SERVER_RATES_GOLD || '1'),
          drop: parseInt(process.env.SERVER_RATES_DROP || '1')
        }
      }
    });
  } catch (error) {
    console.error('Get server info route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching server information'
    });
  }
});

export default router;
