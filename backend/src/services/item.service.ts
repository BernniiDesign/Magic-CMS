// backend/src/services/item.service.ts

import { charactersDB, worldDB } from '../config/database';
import { RowDataPacket } from 'mysql2';

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
   * ✅ Parsear campo de enchantments de TrinityCore
   * 
   * Formato: "id1 duration1 charges1 id2 duration2 charges2 ..."
   * 36 números = 12 slots × 3 valores
   * 
   * Slots importantes:
   * - 0 (índices 0-2): Permanent enchant
   * - 1 (índices 3-5): Temporary enchant
   * - 2 (índices 6-8): Gem socket 1
   * - 3 (índices 9-11): Gem socket 2
   * - 4 (índices 12-14): Gem socket 3
   * - 6 (índices 18-20): Prismatic gem (belt socket)
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

    if (parts.length === 0) {
      return result;
    }

    // SLOT 0: Enchantment permanente (índices 0,1,2)
    if (parts.length > 0 && parts[0] > 0) {
      result.permanent = parts[0];
    }

    // SLOT 1: Enchantment temporal (índices 3,4,5)
    if (parts.length > 3 && parts[3] > 0) {
      result.temporary = parts[3];
    }

    // SLOT 2: Gema 1 (índices 6,7,8)
    if (parts.length > 6 && parts[6] > 0) {
      result.gems.push(parts[6]);
    }

    // SLOT 3: Gema 2 (índices 9,10,11)
    if (parts.length > 9 && parts[9] > 0) {
      result.gems.push(parts[9]);
    }

    // SLOT 4: Gema 3 (índices 12,13,14)
    if (parts.length > 12 && parts[12] > 0) {
      result.gems.push(parts[12]);
    }

    // SLOT 6: Gema prismática (índices 18,19,20)
    if (parts.length > 18 && parts[18] > 0) {
      result.prismatic = parts[18];
    }

    return result;
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