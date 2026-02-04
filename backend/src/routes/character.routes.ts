// backend/src/routes/character.routes.ts

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import characterService from '../services/character.service';
import wotlkdbResolver from '../services/wotlkdb-resolver.service';

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


/**
 * ✅ GET /api/characters/:guid/details
 * CORREGIDO: Tipado explícito en map()
 */
router.get('/:guid/details', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guid = parseInt(req.params.guid, 10);
    const userId = req.user?.id;

    if (!userId || isNaN(guid)) {
      res.status(400).json({ success: false, message: 'Invalid request' });
      return;
    }

    const isOwner = await characterService.verifyCharacterOwnership(guid, userId);
    if (!isOwner) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const character = await characterService.getCharacterDetails(guid);

    if (!character) {
      res.status(404).json({ success: false, message: 'Character not found' });
      return;
    }

    if (character.equipment && character.equipment.length > 0) {
      console.log(`🔍 [CHARACTER API] Procesando ${character.equipment.length} items...`);

      const allEnchantmentIds = new Set<number>();
      
      character.equipment.forEach((item: any) => {
        if (item.enchantmentsParsed) {
          if (item.enchantmentsParsed.permanent) {
            allEnchantmentIds.add(item.enchantmentsParsed.permanent);
          }
          item.enchantmentsParsed.gems?.forEach((gemId: number) => {
            allEnchantmentIds.add(gemId);
          });
          if (item.enchantmentsParsed.prismatic) {
            allEnchantmentIds.add(item.enchantmentsParsed.prismatic);
          }
        }
      });

      console.log(`🔍 [CHARACTER API] Resolviendo ${allEnchantmentIds.size} enchantments únicos`);

      const resolutions = await wotlkdbResolver.resolveMultiple(
        Array.from(allEnchantmentIds)
      );
      
      const resolutionMap = new Map(
        resolutions.map(r => [r.enchantmentId, r])
      );

      const resolvedCount = resolutions.filter(r => r.itemId).length;
      console.log(`✅ [CHARACTER API] Resueltos ${resolvedCount}/${resolutions.length}`);

      // ✅ FIX: Tipado explícito del parámetro g
      character.equipment = character.equipment.map((item: any) => {
        if (!item.enchantmentsParsed) return item;

        const enchantResolution = item.enchantmentsParsed.permanent
          ? resolutionMap.get(item.enchantmentsParsed.permanent)
          : null;

        // ✅ CORRECCIÓN: Tipado explícito en map
        const gemsResolutions = (item.enchantmentsParsed.gems || [])
          .map((gemId: number) => resolutionMap.get(gemId))
          .filter((g: null | undefined): g is NonNullable<typeof g> => g !== null && g !== undefined);

        const prismaticResolution = item.enchantmentsParsed.prismatic
          ? resolutionMap.get(item.enchantmentsParsed.prismatic)
          : null;

        return {
          ...item,
          enchantData: enchantResolution ? {
            enchantmentId: enchantResolution.enchantmentId,
            itemId: enchantResolution.itemId,
            name: enchantResolution.name,
            type: enchantResolution.type,
          } : null,
          
          gemsData: gemsResolutions.map((g: { enchantmentId: any; itemId: any; name: any; type: any; }) => ({
            enchantmentId: g.enchantmentId,
            itemId: g.itemId,
            name: g.name,
            type: g.type,
          })),

          prismaticData: prismaticResolution ? {
            enchantmentId: prismaticResolution.enchantmentId,
            itemId: prismaticResolution.itemId,
            name: prismaticResolution.name,
            type: prismaticResolution.type,
          } : null,
        };
      });

      console.log('✅ [CHARACTER API] Equipment completamente enriquecido');
    }

    res.json({ success: true, character });
    
  } catch (error) {
    console.error('❌ [CHARACTER API] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
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