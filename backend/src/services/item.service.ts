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

interface EnchantmentData {
  id: number;
  type: number;
  name: string;
  description: string;
  stats: string[];
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
   * ✅ ACTUALIZADO: Obtener datos de enchantment desde caché local
   */
  async getEnchantmentData(spellId: number, locale: 'es' | 'en' = 'es'): Promise<EnchantmentData | null> {
    try {
      // Validación de entrada
      if (!spellId || spellId < 1 || spellId > 200000) {
        console.warn('⚠️ [ITEM] Invalid spell ID:', spellId);
        return null;
      }

      console.log('🔍 [ITEM] Fetching enchantment from cache for ID:', spellId);

      // Determinar columnas según locale
      const nameCol = locale === 'es' ? 'COALESCE(name_eses, name_enus)' : 'name_enus';
      const descCol = locale === 'es' ? 'COALESCE(description_eses, description_enus)' : 'description_enus';

      // Query a tabla de caché
      const [enchantments] = await worldDB.query<RowDataPacket[]>(
        `SELECT 
          id,
          ${nameCol} as name,
          type,
          stats,
          ${descCol} as description
         FROM enchantment_cache
         WHERE id = ?
         LIMIT 1`,
        [spellId]
      );

      if (enchantments.length === 0) {
        console.warn('⚠️ [ITEM] Enchantment not found in cache:', spellId);
        
        // Fallback: intentar obtener de item_enchantment_template
        return this.getEnchantmentFromTemplate(spellId);
      }

      const ench = enchantments[0];
      
      // Parsear stats (separados por |)
      const statsArray = ench.stats 
        ? ench.stats.split('|').filter((s: string) => s.trim().length > 0)
        : [];

      const enchantmentData: EnchantmentData = {
        id: ench.id,
        type: ench.type || 3,
        name: ench.name || `Enchantment ${spellId}`,
        description: ench.description || '',
        stats: statsArray
      };

      console.log('✅ [ITEM] Enchantment data loaded from cache:', enchantmentData);
      return enchantmentData;

    } catch (error) {
      console.error('❌ [ITEM] Error fetching enchantment:', error);
      return null;
    }
  }

  /**
   * Fallback: Intentar obtener datos de item_enchantment_template
   */
  private async getEnchantmentFromTemplate(spellId: number): Promise<EnchantmentData | null> {
    try {
      console.log('🔄 [ITEM] Trying fallback: item_enchantment_template');

      const [enchantments] = await worldDB.query<RowDataPacket[]>(
        `SELECT 
          ID as id,
          type_1,
          type_2,
          type_3,
          amount_1,
          amount_2,
          amount_3,
          description
         FROM item_enchantment_template
         WHERE ID = ?
         LIMIT 1`,
        [spellId]
      );

      if (enchantments.length === 0) {
        return null;
      }

      const ench = enchantments[0];
      
      // Parsear stats desde type/amount
      const stats: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const type = ench[`type_${i}`];
        const amount = ench[`amount_${i}`];
        
        if (type && amount && amount > 0) {
          const statName = this.getEnchantmentStatName(type);
          if (statName) {
            stats.push(`+${amount} ${statName}`);
          }
        }
      }

      console.log('✅ [ITEM] Enchantment loaded from template (fallback)');

      return {
        id: ench.id,
        type: ench.type_1 || 3,
        name: `Enchantment ${spellId}`,
        description: ench.description || '',
        stats
      };

    } catch (error) {
      console.error('❌ [ITEM] Fallback also failed:', error);
      return null;
    }
  }

  /**
   * Mapear type de enchantment a nombre de stat legible
   */
  private getEnchantmentStatName(type: number): string | null {
    const statMap: Record<number, string> = {
      3: 'Agility',
      4: 'Strength',
      5: 'Intellect',
      6: 'Spirit',
      7: 'Stamina',
      12: 'Defense Rating',
      13: 'Dodge Rating',
      14: 'Parry Rating',
      15: 'Block Rating',
      16: 'Melee Hit Rating',
      17: 'Ranged Hit Rating',
      18: 'Spell Hit Rating',
      19: 'Melee Critical Strike Rating',
      20: 'Ranged Critical Strike Rating',
      21: 'Spell Critical Strike Rating',
      28: 'Melee Haste Rating',
      29: 'Ranged Haste Rating',
      30: 'Spell Haste Rating',
      31: 'Hit Rating',
      32: 'Critical Strike Rating',
      35: 'Resilience Rating',
      36: 'Haste Rating',
      37: 'Expertise Rating',
      38: 'Attack Power',
      39: 'Ranged Attack Power',
      45: 'Spell Power',
      47: 'Spell Penetration',
      48: 'Health Regeneration',
      49: 'Armor Penetration Rating',
      50: 'Block Value',
    };

    return statMap[type] || null;
  }

  /**
   * Parsear campo de enchantments de TrinityCore
   */
  parseEnchantments(enchantmentString: string): ParsedEnchantments {
    const result: ParsedEnchantments = { gems: [] };

    if (!enchantmentString || enchantmentString.trim() === '') {
      console.log('⚠️ [ITEM] Empty enchantments string');
      return result;
    }

    const parts = enchantmentString.split(' ')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    console.log('📊 [ITEM] Enchantments parts:', parts);

    if (parts.length === 0) {
      return result;
    }

    // Slot 0: Enchantment permanente
    if (parts.length > 0 && parts[0] > 0) {
      result.permanent = parts[0];
      console.log('✅ [ITEM] Permanent enchant:', parts[0]);
    }

    // Slot 1: Enchantment temporal
    if (parts.length > 3 && parts[3] > 0) {
      result.temporary = parts[3];
      console.log('✅ [ITEM] Temporary enchant:', parts[3]);
    }

    // Slots 2, 3, 4: Gemas (índices 6, 9, 12)
    const gemSlots = [6, 9, 12];
    gemSlots.forEach((idx, gemNum) => {
      if (parts.length > idx && parts[idx] > 0) {
        result.gems.push(parts[idx]);
        console.log(`✅ [ITEM] Gem ${gemNum + 1}:`, parts[idx]);
      }
    });

    // Slot 5: Gema prismática (índice 15)
    if (parts.length > 15 && parts[15] > 0) {
      result.prismatic = parts[15];
      console.log('✅ [ITEM] Prismatic gem:', parts[15]);
    }

    console.log('📊 [ITEM] Final parsed enchantments:', result);
    return result;
  }
}

export default new ItemService();