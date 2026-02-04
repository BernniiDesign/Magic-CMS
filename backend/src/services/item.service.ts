// backend/src/services/item.service.ts

import { charactersDB, worldDB } from '../config/database';
import { RowDataPacket } from 'mysql2';
import wotlkdbService from '../shared/wotlkdb.service';

interface ItemInstanceData {
  guid: number;
  itemEntry: number;
  enchantments: string;
  randomPropertyId: number;
  durability: number;
  count: number;
}

interface ParsedEnchantments {
  permanent?: number;
  temporary?: number;
  gems: number[];
  prismatic?: number;
}

/**
 * ✅ Estructura enriquecida con datos de WotLKDB
 */
interface EnchantmentWithItem {
  enchantmentId: number;
  itemId?: number;        // ✅ Item ID obtenido de WotLKDB
  itemName?: string;      // ✅ Nombre del item
  quality?: number;       // ✅ Calidad del item
}

class ItemService {
  /**
   * Obtener datos completos de un item instanciado
   */
  async getItemInstance(itemGuid: number): Promise<ItemInstanceData | null> {
    try {
      const [items] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          guid,
          itemEntry,
          enchantments,
          randomPropertyId,
          durability,
          count
         FROM item_instance 
         WHERE guid = ?`,
        [itemGuid]
      );

      return items.length > 0 ? (items[0] as ItemInstanceData) : null;
    } catch (error) {
      console.error('❌ [ITEM] Error fetching item instance:', error);
      return null;
    }
  }

  /**
   * Parsear campo de enchantments de TrinityCore
   * Formato: "id1 duration1 charges1 id2 duration2 charges2 ..."
   */
  parseEnchantments(enchantmentString: string): ParsedEnchantments {
    const result: ParsedEnchantments = { gems: [] };

    if (!enchantmentString || enchantmentString.trim() === '') {
      return result;
    }

    const parts = enchantmentString
      .split(' ')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    console.log('📊 [ITEM] Parsing enchantments:', parts.length, 'valores');

    // SLOT 0: Enchantment permanente (índices 0,1,2)
    if (parts.length > 0 && parts[0] > 0) {
      result.permanent = parts[0];
      console.log('✅ [ITEM] Permanent enchant:', parts[0]);
    }

    // SLOT 1: Enchantment temporal (índices 3,4,5)
    if (parts.length > 3 && parts[3] > 0) {
      result.temporary = parts[3];
      console.log('✅ [ITEM] Temporary enchant:', parts[3]);
    }

    // SLOT 2: Gema 1 (índices 6,7,8)
    if (parts.length > 6 && parts[6] > 0) {
      result.gems.push(parts[6]);
      console.log('✅ [ITEM] Gem 1:', parts[6]);
    }

    // SLOT 3: Gema 2 (índices 9,10,11)
    if (parts.length > 9 && parts[9] > 0) {
      result.gems.push(parts[9]);
      console.log('✅ [ITEM] Gem 2:', parts[9]);
    }

    // SLOT 4: Gema 3 (índices 12,13,14)
    if (parts.length > 12 && parts[12] > 0) {
      result.gems.push(parts[12]);
      console.log('✅ [ITEM] Gem 3:', parts[12]);
    }

    // SLOT 6: Gema prismática (índices 18,19,20)
    if (parts.length > 18 && parts[18] > 0) {
      result.prismatic = parts[18];
      console.log('✅ [ITEM] Prismatic gem:', parts[18]);
    }

    console.log('📊 [ITEM] Final parsed:', result);
    return result;
  }

  /**
   * ✅ NUEVO: Obtener datos del enchantment desde WotLKDB
   */
  async getEnchantmentData(enchantmentId: number): Promise<EnchantmentWithItem | null> {
    try {
      if (!enchantmentId || enchantmentId < 1) {
        return null;
      }

      console.log('🔍 [ITEM] Obteniendo datos para enchantment:', enchantmentId);

      // Obtener item ID desde WotLKDB
      const mapping = await wotlkdbService.getItemIdFromEnchantment(enchantmentId);

      if (!mapping || typeof mapping !== 'object') {
        console.warn('⚠️ [ITEM] No se encontró item para enchantment:', enchantmentId);
        return {
          enchantmentId,
          itemId: undefined,
          itemName: `Enchantment ${enchantmentId}`,
          quality: 0
        };
      }

      return {
        enchantmentId,
        itemId: mapping.itemId,
        itemName: mapping.itemName,
        quality: mapping.quality
      };
    } catch (error) {
      console.error('❌ [ITEM] Error getting enchantment data:', error);
      return null;
    }
  }

  /**
   * ✅ NUEVO: Obtener datos de múltiples enchantments en batch
   */
  async getEnchantmentsData(enchantmentIds: number[]): Promise<Map<number, EnchantmentWithItem>> {
    try {
      const validIds = enchantmentIds.filter(id => id && id > 0);
      
      if (validIds.length === 0) {
        return new Map();
      }

      console.log('🔍 [ITEM] Obteniendo datos para', validIds.length, 'enchantments');

      // Obtener todos los mappings en batch
      const mappings: Map<number, { itemId: number; itemName: string; quality: number }> = await wotlkdbService.getItemIdsFromEnchantments(validIds);

      // Convertir a estructura EnchantmentWithItem
      const result = new Map<number, EnchantmentWithItem>();

      for (const [enchId, mapping] of mappings) {
        result.set(enchId, {
          enchantmentId: enchId,
          itemId: mapping.itemId,
          itemName: mapping.itemName,
          quality: mapping.quality
        });
      }

      // Para los que no se encontraron, agregar placeholder
      for (const enchId of validIds) {
        if (!result.has(enchId)) {
          result.set(enchId, {
            enchantmentId: enchId,
            itemId: undefined,
            itemName: `Enchantment ${enchId}`,
            quality: 0
          });
        }
      }

      return result;
    } catch (error) {
      console.error('❌ [ITEM] Error getting enchantments data:', error);
      return new Map();
    }
  }

  /**
   * Obtener item template desde world DB
   */
  async getItemTemplate(itemEntry: number): Promise<any | null> {
    try {
      const [items] = await worldDB.query<RowDataPacket[]>(
        `SELECT 
          entry,
          class,
          subclass,
          name,
          displayid,
          Quality,
          ItemLevel,
          RequiredLevel
         FROM item_template 
         WHERE entry = ?`,
        [itemEntry]
      );

      return items.length > 0 ? items[0] : null;
    } catch (error) {
      console.error('❌ [ITEM] Error fetching item template:', error);
      return null;
    }
  }
}

export default new ItemService();