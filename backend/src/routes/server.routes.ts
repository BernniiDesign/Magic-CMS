// backend/src/routes/server.routes.ts

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import serverService from '../services/server.service';

const router = Router();

/**
 * GET /api/server/status
 * Estado público del servidor (no requiere auth)
 */
router.get('/status', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = await serverService.getServerStatus();
    res.json({ success: true, status });
  } catch (error) {
    console.error('❌ [SERVER STATUS] Error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estado del servidor' });
  }
});

/**
 * GET /api/server/stats
 * Estadísticas completas (requiere autenticación)
 */
router.get('/stats', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await serverService.getServerStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ [SERVER STATS] Error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas del servidor' });
  }
});

/**
 * GET /api/server/top-killers
 * Top personajes por kills (público, usado por CommunitySidebar)
 */
router.get('/top-killers', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const killers = await serverService.getTopKillers(5);
    res.json({ success: true, killers });
  } catch (error) {
    console.error('❌ [TOP KILLERS] Error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener top killers' });
  }
});

export default router;