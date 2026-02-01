// backend/src/routes/character.routes.ts

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import characterService from '../services/character.service';
import itemService from '../services/item.service';

const router = Router();

// Get characters for an account
router.get('/account/:accountId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accountId = parseInt(req.params.accountId, 10);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (isNaN(accountId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
      return;
    }

    if (Number(userId) !== Number(accountId)) {
      res.status(403).json({
        success: false,
        message: 'You can only view your own characters'
      });
      return;
    }

    const characters = await characterService.getAccountCharacters(accountId);
    
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
router.get('/:guid/details', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guid = parseInt(req.params.guid, 10);
    const userId = req.user?.id;

    if (!userId || isNaN(guid)) {
      res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
      return;
    }

    const isOwner = await characterService.verifyCharacterOwnership(guid, userId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: 'You can only view your own characters'
      });
      return;
    }

    const character = await characterService.getCharacterDetails(guid);

    if (!character) {
      res.status(404).json({
        success: false,
        message: 'Character not found'
      });
      return;
    }

    // Enriquecer equipo con datos de encantamientos parseados
    if (character.equipment) {
      character.equipment = await Promise.all(
        character.equipment.map(async (item: any) => {
          const itemInstance = await itemService.getItemInstance(item.item);
          if (itemInstance) {
            return {
              ...item,
              entry: itemInstance.itemEntry,
              enchantments: itemInstance.enchantments,
              enchantmentsParsed: itemService.parseEnchantments(itemInstance.enchantments),
              randomProperty: itemInstance.randomPropertyId
            };
          }
          return item;
        })
      );
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
router.get('/:guid', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guid = parseInt(req.params.guid, 10);

    if (isNaN(guid)) {
      res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
      return;
    }

    const character = await characterService.getCharacterDetails(guid);

    if (!character) {
      res.status(404).json({
        success: false,
        message: 'Character not found'
      });
      return;
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
router.get('/top', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const characters = await characterService.getTopCharacters(100);

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