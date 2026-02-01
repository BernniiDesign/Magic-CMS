// backend/src/services/character.service.ts

import { charactersDB } from '../config/database';
import { RowDataPacket } from 'mysql2';
import itemService from './item.service'; // ✅ IMPORTACIÓN FALTANTE

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

// ✅ INTERFAZ ACTUALIZADA CON TODOS LOS CAMPOS
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
  icon: string;              // Ya no es nullable, siempre tendrá valor
  enchantmentsParsed: any;
}

export interface Achievement {
  achievement: number;
  date: number;
}

class CharacterService {
  // ... (otros métodos sin cambios)

  /**
   * Obtener equipo del personaje con iconos y enchantments parseados
   */
  async getCharacterEquipment(guid: number): Promise<CharacterEquipment[]> {
    try {
      const [equipment] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          ci.slot,
          ci.item,
          ci.item as guid,
          ii.itemEntry,
          ii.enchantments,
          ii.randomPropertyId,
          it.name,
          it.Quality as quality,
          -- ✅ Traer icono directamente de item_icon (solo una tabla)
          COALESCE(ic.icon, 'inv_misc_questionmark') as icon
         FROM character_inventory ci
         INNER JOIN item_instance ii ON ci.item = ii.guid
         INNER JOIN world.item_template it ON ii.itemEntry = it.entry
         LEFT JOIN characters.item_icon ic ON ii.itemEntry = ic.entry
         WHERE ci.guid = ? AND ci.slot < 19
         ORDER BY ci.slot`,
        [guid]
      );

      return equipment.map((item: RowDataPacket) => ({
        slot: item.slot,
        item: item.item,
        guid: item.guid,
        itemEntry: item.itemEntry,
        enchantments: item.enchantments,
        randomPropertyId: item.randomPropertyId,
        name: item.name,
        quality: item.quality,
        displayid: 0, // Ya no necesario, pero mantener para compatibilidad
        // ✅ Icono viene directo de la query, agregar .jpg si falta
        icon: item.icon.toLowerCase().endsWith('.jpg') 
          ? item.icon 
          : `${item.icon}.jpg`,
        enchantmentsParsed: itemService.parseEnchantments(item.enchantments)
      })) as CharacterEquipment[];
      
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo equipo:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas del personaje
   */
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

  /**
   * Obtener logros del personaje
   */
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

  /**
   * Obtener personajes de una cuenta
   */
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

  /**
   * Obtener un personaje con detalles completos
   */
  async getCharacterDetails(guid: number): Promise<any | null> {
    try {
      console.log('📝 [CHARACTERS] Obteniendo detalles del personaje GUID:', guid);
      
      // Datos básicos del personaje
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        `SELECT * FROM characters WHERE guid = ?`,
        [guid]
      );

      if (characters.length === 0) {
        return null;
      }

      const character = characters[0];

      // Obtener estadísticas
      const stats = await this.getCharacterStats(guid);

      // Obtener equipo (ya incluye parsing de enchantments)
      const equipment = await this.getCharacterEquipment(guid);

      // Obtener logros
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

  /**
   * Verificar si un personaje pertenece a una cuenta
   */
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

  /**
   * Obtener top personajes por nivel
   */
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