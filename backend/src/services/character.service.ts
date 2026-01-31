import { charactersDB } from '../config/database';
import { RowDataPacket } from 'mysql2';

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
  maxpower1: number; // Mana
  maxpower2: number; // Rage
  maxpower3: number; // Focus
  maxpower4: number; // Energy
  maxpower5: number; // Happiness
  maxpower6: number; // Runes
  maxpower7: number; // Runic Power
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
}

export interface Achievement {
  achievement: number;
  date: number;
}

class CharacterService {
  // Obtener personajes de una cuenta
  async getAccountCharacters(accountId: number): Promise<Character[]> {
    try {
      console.log('📝 [CHARACTERS] Obteniendo personajes para cuenta ID:', accountId);
      
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        `SELECT guid, name, race, class, gender, level, money, totaltime, account, zone, map, online,
                totalKills, arenaPoints, totalHonorPoints
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

  // Obtener un personaje con detalles completos
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

      // Obtener equipo
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

  // Obtener estadísticas del personaje
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

  // Obtener equipo del personaje
  async getCharacterEquipment(guid: number): Promise<CharacterEquipment[]> {
    try {
      const [equipment] = await charactersDB.query<RowDataPacket[]>(
        `SELECT ci.slot, ci.item, ii.itemEntry as entry, ii.enchantments
         FROM character_inventory ci
         JOIN item_instance ii ON ci.item = ii.guid
         WHERE ci.guid = ? AND ci.slot < 19
         ORDER BY ci.slot`,
        [guid]
      );

      return equipment as CharacterEquipment[];
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo equipo:', error);
      return [];
    }
  }

  // Obtener logros del personaje
  async getCharacterAchievements(guid: number): Promise<Achievement[]> {
    try {
      const [achievements] = await charactersDB.query<RowDataPacket[]>(
        `SELECT achievement, date FROM character_achievement WHERE guid = ? ORDER BY date DESC LIMIT 50`,
        [guid]
      );

      return achievements as Achievement[];
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo achievements:', error);
      return [];
    }
  }

  // Verificar si un personaje pertenece a una cuenta
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

  // Obtener top personajes por nivel
  async getTopCharacters(limit: number = 100): Promise<any[]> {
    try {
      console.log('🏆 [CHARACTERS] Obteniendo top', limit, 'personajes');
      
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        `SELECT guid, name, race, class, gender, level, totaltime 
         FROM characters 
         ORDER BY level DESC, totaltime DESC 
         LIMIT ?`,
        [limit]
      );

      console.log('🏆 [CHARACTERS] Top personajes encontrados:', characters.length);
      return characters;
    } catch (error) {
      console.error('❌ [CHARACTERS] Error obteniendo top personajes:', error);
      return [];
    }
  }
}

export default new CharacterService();
