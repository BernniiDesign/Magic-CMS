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
   * Obtener datos base del item desde world DB
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
          BuyPrice,
          SellPrice,
          InventoryType,
          AllowableClass,
          AllowableRace,
          ItemLevel,
          RequiredLevel,
          Material,
          delay,
          RangedModRange,
          bonding,
          description,
          socketBonus,
          GemProperties,
          socketColor_1,
          socketColor_2,
          socketColor_3
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

  /**
   * Parsear campo de encantamientos de TrinityCore
   */
  parseEnchantments(enchantmentString: string): ParsedEnchantments {
    if (!enchantmentString) {
      return { gems: [] };
    }

    const parts = enchantmentString.split(' ').map(Number);
    const result: ParsedEnchantments = { gems: [] };

    // Slot 0 = Encantamiento permanente
    if (parts[0] > 0) result.permanent = parts[0];

    // Slot 1 = Encantamiento temporal
    if (parts.length > 3 && parts[3] > 0) result.temporary = parts[3];

    // Slots 2, 3, 4 = Gemas (índices 6, 9, 12)
    [6, 9, 12].forEach(idx => {
      if (parts.length > idx && parts[idx] > 0) {
        result.gems.push(parts[idx]);
      }
    });

    // Slot 5 = Gema prismática (índice 15)
    if (parts.length > 15 && parts[15] > 0) {
      result.prismatic = parts[15];
    }

    return result;
  }
}

export default new ItemService();