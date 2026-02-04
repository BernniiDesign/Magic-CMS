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

    if (parts.length > 0 && parts[0] > 0) {
      result.permanent = parts[0];
      console.log('✅ [ITEM] Permanent enchant:', parts[0]);
    }

    if (parts.length > 3 && parts[3] > 0) {
      result.temporary = parts[3];
      console.log('✅ [ITEM] Temporary enchant:', parts[3]);
    }

    if (parts.length > 6 && parts[6] > 0) {
      result.gems.push(parts[6]);
      console.log('✅ [ITEM] Gem 1:', parts[6]);
    }

    if (parts.length > 9 && parts[9] > 0) {
      result.gems.push(parts[9]);
      console.log('✅ [ITEM] Gem 2:', parts[9]);
    }

    if (parts.length > 12 && parts[12] > 0) {
      result.gems.push(parts[12]);
      console.log('✅ [ITEM] Gem 3:', parts[12]);
    }

    if (parts.length > 18 && parts[18] > 0) {
      result.prismatic = parts[18];
      console.log('✅ [ITEM] Prismatic gem:', parts[18]);
    }

    console.log('📊 [ITEM] Final parsed:', result);
    return result;
  }

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