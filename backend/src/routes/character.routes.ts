// backend/src/routes/character.routes.ts

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import characterService from '../services/character.service';
import itemService from '../services/item.service';
import wotlkdbResolver from '../services/wotlkdb-resolver.service';
import { scrapingLimiter } from '../middleware/scraping-limiter.middleware';

const router = Router();

/**
 * ✅ GET /api/characters/account/:accountId
 * Obtener personajes de una cuenta específica
 */
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
 * Obtener detalles completos del personaje con equipment enriquecido usando WotLKDB
 */
router.get(
  '/:guid/details',
  authenticateToken,
  scrapingLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const guid = parseInt(req.params.guid, 10);
      const userId = req.user?.id;

      if (!userId || isNaN(guid)) {
        res.status(400).json({ success: false, message: 'Invalid request' });
        return;
      }

      // Verificar ownership
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

      // ✅ ENRIQUECER EQUIPMENT CON WOTLKDB RESOLVER
      if (character.equipment && character.equipment.length > 0) {
        console.log(`🔍 [CHARACTER] Procesando ${character.equipment.length} items del personaje ${character.name}...`);

        // 1️⃣ Parsear enchantments de cada item
        const parsedItems = await Promise.all(
          character.equipment.map(async (item: any) => {
            const itemInstance = await itemService.getItemInstance(item.item);
            
            if (!itemInstance) {
              console.warn(`⚠️ [CHARACTER] No se encontró item instance para guid ${item.item}`);
              return item;
            }

            // Parsear campo enchantments de TrinityCore
            const enchantmentsParsed = itemService.parseEnchantments(itemInstance.enchantments);
            
            console.log(`📦 [CHARACTER] Item ${item.item} (Entry: ${itemInstance.itemEntry}):`, {
              permanent: enchantmentsParsed.permanent,
              gems: enchantmentsParsed.gems,
              prismatic: enchantmentsParsed.prismatic,
            });

            return {
              ...item,
              itemEntry: itemInstance.itemEntry,
              enchantments: itemInstance.enchantments,
              enchantmentsParsed,
              randomProperty: itemInstance.randomPropertyId,
            };
          })
        );

        // 2️⃣ Recolectar TODOS los enchantment IDs únicos
        const allEnchantmentIds = new Set<number>();
        
        parsedItems.forEach((item: any) => {
          if (!item.enchantmentsParsed) return;

          // Enchantment permanente
          if (item.enchantmentsParsed.permanent) {
            allEnchantmentIds.add(item.enchantmentsParsed.permanent);
          }

          // Gemas regulares
          item.enchantmentsParsed.gems?.forEach((gemId: number) => {
            if (gemId > 0) {
              allEnchantmentIds.add(gemId);
            }
          });

          // Gema prismática
          if (item.enchantmentsParsed.prismatic) {
            allEnchantmentIds.add(item.enchantmentsParsed.prismatic);
          }
        });

        console.log(`🔍 [CHARACTER] Encontrados ${allEnchantmentIds.size} enchantments únicos`);

        // 3️⃣ Resolver TODOS los enchantments usando WotLKDB (batch)
        const resolutions = await wotlkdbResolver.resolveMultiple(Array.from(allEnchantmentIds));
        
        // Crear mapa para lookup rápido
        const resolutionMap = new Map(
          resolutions.map(r => [r.enchantmentId, r])
        );

        const resolvedCount = resolutions.filter(r => r.itemId !== null).length;
        console.log(`✅ [CHARACTER] Resueltos ${resolvedCount}/${resolutions.length} enchantments desde WotLKDB`);

        // 4️⃣ Enriquecer cada item con los datos resueltos
        character.equipment = parsedItems.map((item: any) => {
          if (!item.enchantmentsParsed) return item;

          // Resolver enchantment permanente
          const enchantResolution = item.enchantmentsParsed.permanent
            ? resolutionMap.get(item.enchantmentsParsed.permanent)
            : null;

          // Resolver gemas con tipado explícito
          const gemsResolutions = (item.enchantmentsParsed.gems || [])
            .map((gemId: number) => resolutionMap.get(gemId))
            .filter((g: any): g is NonNullable<typeof g> => g !== null && g !== undefined);

          // Resolver gema prismática
          const prismaticResolution = item.enchantmentsParsed.prismatic
            ? resolutionMap.get(item.enchantmentsParsed.prismatic)
            : null;

          return {
            ...item,
            
            // ✅ Datos del enchantment permanente
            enchantData: enchantResolution ? {
              enchantmentId: enchantResolution.enchantmentId,
              itemId: enchantResolution.itemId,
              name: enchantResolution.name,
              type: enchantResolution.type,
            } : null,
            
            // ✅ Datos de las gemas
            gemsData: gemsResolutions.map((g: any) => ({
              enchantmentId: g.enchantmentId,
              itemId: g.itemId,
              name: g.name,
              type: g.type,
            })),

            // ✅ Datos de gema prismática
            prismaticData: prismaticResolution ? {
              enchantmentId: prismaticResolution.enchantmentId,
              itemId: prismaticResolution.itemId,
              name: prismaticResolution.name,
              type: prismaticResolution.type,
            } : null,
          };
        });

        console.log('✅ [CHARACTER] Equipment enriquecido completamente');
      }

      res.json({ success: true, character });
      
    } catch (error) {
      console.error('❌ [CHARACTER DETAILS] Error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * ✅ GET /api/characters/:guid
 * Obtener información básica de un personaje (público)
 */
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
    console.error('❌ [GET CHARACTER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * ✅ GET /api/characters/top
 * Obtener top personajes (público)
 */
router.get('/top', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const characters = await characterService.getTopCharacters(100);

    res.json({
      success: true,
      characters
    });
  } catch (error) {
    console.error('❌ [TOP CHARACTERS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;