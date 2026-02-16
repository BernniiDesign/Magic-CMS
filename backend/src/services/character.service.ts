// backend/src/services/character.service.ts

import { charactersDB } from '../config/database';
import { RowDataPacket } from 'mysql2';
import itemService from './item.service';
import wotlkdbResolver from './wotlkdb-resolver.service'; // ✅ AÑADIDO

// ✅ INTERFACES
export interface Character {
  guid: number;
  name: string;
  race: number;
  class: number;
  gender: number;
  level: number;
  money: number;
  totaltime: number;
  account: number;
  zone: number;
  map: number;
  online: number;
  totalKills?: number;
  arenaPoints?: number;
  totalHonorPoints?: number;
}

export interface CharacterStats {
  maxhealth: number;
  maxpower1: number;
  maxpower2: number;
  maxpower3: number;
  maxpower4: number;
  maxpower5: number;
  maxpower6: number;
  maxpower7: number;
  strength: number;
  agility: number;
  stamina: number;
  intellect: number;
  spirit: number;
  armor: number;
  attackPower: number;
  rangedAttackPower: number;
  spellPower: number;
  critPct: number;
  dodgePct: number;
  parryPct: number;
}

export interface CharacterEquipment {
  slot: number;
  item: number;
  guid: number;
  itemEntry: number;
  enchantments: string;
  randomPropertyId: number;
  name: string;
  quality: number;
  displayid: number;
  icon: string;
  enchantmentsParsed: any;
  enchantData?: {
    enchantmentId: number;
    itemId: number | null;
    name: string;
    type: string;
  } | null;
  gemsData?: Array<{
    enchantmentId: number;
    itemId: number | null;
    name: string;
    type: string;
  }>;
  prismaticData?: {
    enchantmentId: number;
    itemId: number | null;
    name: string;
    type: string;
  } | null;
}

export interface Achievement {
  achievement: number;
  date: number;
}

// ✅ INTERFACE LOCAL
interface EnchantmentResolution {
  enchantmentId: number;
  itemId: number | null;
  name: string;
  type: 'gem' | 'enchant' | 'unknown';
}

class CharacterService {
  /**
   * Obtener equipo del personaje con iconos y enchantments resueltos
   */
  async getCharacterEquipment(guid: number): Promise<CharacterEquipment[]> {
    try {
      const [equipment] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          ci.slot,
          ci.item,
          ii.itemEntry,
          ii.enchantments,
          ii.randomPropertyId,
          it.name,
          it.Quality as quality,
          COALESCE(ic.icon, 'inv_misc_questionmark') as icon
        FROM character_inventory ci
        INNER JOIN item_instance ii ON ci.item = ii.guid
        INNER JOIN world.item_template it ON ii.itemEntry = it.entry
        LEFT JOIN item_icon ic ON ii.itemEntry = ic.entry
        WHERE ci.guid = ? AND ci.slot < 19
        ORDER BY ci.slot`,
        [guid]
      );

      const enriched = await Promise.all(
        equipment.map(async (item: RowDataPacket) => {
          const parsed = itemService.parseEnchantments(item.enchantments as string);
          
          // Resolver TODOS los enchantment IDs a item IDs
          const [permanentResolution, gemsResolutions, prismaticResolution] = await Promise.all([
            parsed.permanent ? wotlkdbResolver.resolveEnchantment(parsed.permanent) : null,
            Promise.all(parsed.gems.map(id => wotlkdbResolver.resolveEnchantment(id))),
            parsed.prismatic ? wotlkdbResolver.resolveEnchantment(parsed.prismatic) : null,
          ]);

          return {
            slot: item.slot as number,
            item: item.item as number,
            guid: item.item as number,
            itemEntry: item.itemEntry as number,
            enchantments: item.enchantments as string,
            randomPropertyId: item.randomPropertyId as number,
            name: item.name as string,
            quality: item.quality as number,
            displayid: 0,
            icon: (item.icon as string).toLowerCase().endsWith('.jpg') 
              ? item.icon as string
              : `${item.icon}.jpg`,
            enchantmentsParsed: parsed,
            
            enchantData: permanentResolution ? {
              enchantmentId: permanentResolution.enchantmentId,
              itemId: permanentResolution.itemId,
              name: permanentResolution.name,
              type: permanentResolution.type,
            } : null,
            
            gemsData: gemsResolutions.map((g: EnchantmentResolution) => ({
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
        })
      );

      return enriched as CharacterEquipment[];
      
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo equipo:', error);
      return [];
    }
  }

  async getCharacterStats(guid: number): Promise<CharacterStats | null> {
    try {
      const [stats] = await charactersDB.query<RowDataPacket[]>(
        `SELECT * FROM character_stats WHERE guid = ?`,
        [guid]
      );

      if (stats.length === 0) {
        return null;
      }

      return stats[0] as CharacterStats;
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo stats:', error);
      return null;
    }
  }

  async getCharacterAchievements(guid: number): Promise<Achievement[]> {
    try {
      const [achievements] = await charactersDB.query<RowDataPacket[]>(
        `SELECT achievement, date 
         FROM character_achievement 
         WHERE guid = ? 
         ORDER BY date DESC 
         LIMIT 50`,
        [guid]
      );

      return achievements as Achievement[];
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo achievements:', error);
      return [];
    }
  }

  async getAccountCharacters(accountId: number): Promise<Character[]> {
    try {
      console.log('📝 [CHARACTERS] Obteniendo personajes para cuenta ID:', accountId);
      
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          guid, name, race, class, gender, level, money, totaltime, 
          account, zone, map, online, totalKills, arenaPoints, totalHonorPoints
         FROM characters 
         WHERE account = ? 
         ORDER BY level DESC, totaltime DESC`,
        [accountId]
      );

      console.log(`📝 [CHARACTERS] Personajes encontrados: ${characters.length}`);
      
      return characters as Character[];
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo personajes:', error);
      return [];
    }
  }

  async getCharacterDetails(guid: number): Promise<any | null> {
    try {
      console.log('📝 [CHARACTERS] Obteniendo detalles del personaje GUID:', guid);
      
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        `SELECT * FROM characters WHERE guid = ?`,
        [guid]
      );

      if (characters.length === 0) {
        return null;
      }

      const character = characters[0];
      const stats = await this.getCharacterStats(guid);
      const equipment = await this.getCharacterEquipment(guid);
      const achievements = await this.getCharacterAchievements(guid);

      return {
        ...character,
        stats,
        equipment,
        achievements,
      };
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo detalles:', error);
      return null;
    }
  }

  async verifyCharacterOwnership(guid: number, accountId: number): Promise<boolean> {
    try {
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        'SELECT guid FROM characters WHERE guid = ? AND account = ?',
        [guid, accountId]
      );

      const isOwner = characters.length > 0;
      console.log(`🔐 [CHARACTERS] Verificación de propiedad - GUID: ${guid}, Account: ${accountId}, Es dueño: ${isOwner}`);
      
      return isOwner;
    } catch (error) {
      console.error('❌ [CHARACTERS] Error verificando propiedad:', error);
      return false;
    }
  }

  async getTopCharacters(limit: number = 100): Promise<Character[]> {
    try {
      console.log('🏆 [CHARACTERS] Obteniendo top', limit, 'personajes');
      
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          guid, name, race, class, gender, level, totaltime 
         FROM characters 
         ORDER BY level DESC, totaltime DESC 
         LIMIT ?`,
        [limit]
      );

      console.log('🏆 [CHARACTERS] Top personajes encontrados:', characters.length);
      return characters as Character[];
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo top personajes:', error);
      return [];
    }
  }
}

export default new CharacterService();