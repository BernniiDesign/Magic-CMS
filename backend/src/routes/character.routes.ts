import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import characterService from '../services/character.service';

const router = Router();

// Get characters for an account
router.get('/account/:accountId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId, 10);
    const userId = req.user?.id;

    console.log('📝 [CHARACTERS ROUTE] Petición recibida');
    console.log('📝 [CHARACTERS ROUTE] User ID del token:', userId);
    console.log('📝 [CHARACTERS ROUTE] Account ID solicitado:', accountId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    // Verificación de seguridad
    if (Number(userId) !== Number(accountId)) {
      console.error('❌ [CHARACTERS ROUTE] Acceso denegado');
      return res.status(403).json({
        success: false,
        message: 'You can only view your own characters'
      });
    }

    console.log('✅ [CHARACTERS ROUTE] Acceso permitido, obteniendo personajes...');
    const characters = await characterService.getAccountCharacters(accountId);
    
    console.log('✅ [CHARACTERS ROUTE] Personajes obtenidos:', characters.length);
    
    res.json({
      success: true,
      characters
    });
  } catch (error) {
    console.error('❌ [CHARACTERS ROUTE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get character details (stats, equipment, achievements)
router.get('/:guid/details', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const guid = parseInt(req.params.guid, 10);
    const userId = req.user?.id;

    if (!userId || isNaN(guid)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Verificar que el personaje pertenece al usuario
    const isOwner = await characterService.verifyCharacterOwnership(guid, userId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own characters'
      });
    }

    const character = await characterService.getCharacterDetails(guid);

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    res.json({
      success: true,
      character
    });
  } catch (error) {
    console.error('Get character details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get a specific character (basic info, public)
router.get('/:guid', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const guid = parseInt(req.params.guid, 10);

    if (isNaN(guid)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    const character = await characterService.getCharacterDetails(guid);

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    res.json({
      success: true,
      character
    });
  } catch (error) {
    console.error('Get character error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get top characters (public)
router.get('/top', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const characters = await characterService.getTopCharacters(limit);

    res.json({
      success: true,
      characters
    });
  } catch (error) {
    console.error('Get top characters error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
