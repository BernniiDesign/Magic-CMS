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


router.get('/:guid/details', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guid = parseInt(req.params.guid, 10);
    const userId = req.user?.id;

    if (!userId || isNaN(guid)) {
      res.status(400).json({ success: false, message: 'Invalid request' });
      return;
    }

    // Verificar propiedad
    const isOwner = await characterService.verifyCharacterOwnership(guid, userId);
    if (!isOwner) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    // Obtener datos base del personaje
    const character = await characterService.getCharacterDetails(guid);

    if (!character) {
      res.status(404).json({ success: false, message: 'Character not found' });
      return;
    }

    // ✅ ENRIQUECER EQUIPMENT CON WOTLKDB
    if (character.equipment && character.equipment.length > 0) {
      console.log(`🔍 [CHARACTER] Procesando ${character.equipment.length} items...`);

      // 1. Parsear enchantments de todos los items
      const parsedItems = await Promise.all(
        character.equipment.map(async (item: any) => {
          const itemInstance = await itemService.getItemInstance(item.item);
          
          if (!itemInstance) return item;

          const parsed = itemService.parseEnchantments(itemInstance.enchantments);
          
          return {
            ...item,
            itemEntry: itemInstance.itemEntry,
            enchantmentsParsed: parsed,
            randomProperty: itemInstance.randomPropertyId,
          };
        })
      );

      // 2. Recolectar TODOS los enchantment IDs únicos
      const allEnchantmentIds = new Set<number>();
      
      parsedItems.forEach((item: any) => {
        if (item.enchantmentsParsed) {
          if (item.enchantmentsParsed.permanent) {
            allEnchantmentIds.add(item.enchantmentsParsed.permanent);
          }
          item.enchantmentsParsed.gems?.forEach((gemId: number) => {
            allEnchantmentIds.add(gemId);
          });
        }
      });

      console.log(`🔍 [CHARACTER] Resolviendo ${allEnchantmentIds.size} enchantments con WotLKDB...`);

      // 3. Resolver todos los enchantments a item IDs usando WotLKDB
      const resolutions = await wotlkdbResolver.resolveMultiple(Array.from(allEnchantmentIds));
      
      // Crear mapa para lookup rápido
      const resolutionMap = new Map(
        resolutions.map(r => [r.enchantmentId, r])
      );

      console.log(`✅ [CHARACTER] Resueltos ${resolutions.filter(r => r.itemId).length}/${resolutions.length} enchantments`);

      // 4. Enriquecer cada item con los datos resueltos
      character.equipment = parsedItems.map((item: any) => {
        if (!item.enchantmentsParsed) return item;

        // Resolver enchantment permanente
        const enchantResolution = item.enchantmentsParsed.permanent
          ? resolutionMap.get(item.enchantmentsParsed.permanent)
          : null;

        // Resolver gemas
        const gemsResolutions = item.enchantmentsParsed.gems?.map((gemId: number) => 
          resolutionMap.get(gemId)
        ).filter(Boolean) || [];

        return {
          ...item,
          // ✅ Datos del enchantment (con item ID resuelto)
          enchantData: enchantResolution ? {
            enchantmentId: enchantResolution.enchantmentId,
            itemId: enchantResolution.itemId,
            name: enchantResolution.name,
            type: enchantResolution.type,
          } : null,
          
          // ✅ Datos de las gemas (con item IDs resueltos)
          gemsData: gemsResolutions.map(g => ({
            enchantmentId: g!.enchantmentId,
            itemId: g!.itemId,
            name: g!.name,
            type: g!.type,
          })),
        };
      });

      console.log('✅ [CHARACTER] Equipment enriquecido completamente');
    }

    res.json({ success: true, character });
    
  } catch (error) {
    console.error('❌ [CHARACTER DETAILS] Error:', error);
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