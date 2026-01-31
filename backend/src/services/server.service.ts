import { authDB, charactersDB } from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface RealmStatus {
  id: number;
  name: string;
  address: string;
  port: number;
  icon: number;
  flag: number;
  timezone: number;
  allowedSecurityLevel: number;
  population: number;
  gamebuild: number;
  online: boolean;
  playersOnline?: number;
  uptime?: string;
}

export interface ServerStats {
  totalAccounts: number;
  totalCharacters: number;
  charactersOnline: number;
  allianceCharacters: number;
  hordeCharacters: number;
  maxLevel: number;
}

class ServerService {
  // Verificar si el servidor está online usando múltiples métodos
  private async checkServerOnline(): Promise<{ online: boolean; playersOnline: number; uptime: string }> {
    try {
      // Método 1: Contar jugadores online
      const [onlineCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM characters WHERE online = 1'
      );
      const playersOnline = onlineCount[0].total;

      // Método 2: Verificar última entrada en uptime (si existe)
      let uptimeRecent = false;
      let uptimeString = 'Unknown';
      
      try {
        const [uptimeCheck] = await authDB.query<RowDataPacket[]>(
          'SELECT starttime, uptime FROM uptime ORDER BY starttime DESC LIMIT 1'
        );
        
        if (uptimeCheck.length > 0) {
          const lastStart = uptimeCheck[0].starttime;
          const currentTime = Math.floor(Date.now() / 1000);
          const timeSinceStart = currentTime - lastStart;
          
          // Si el servidor inició hace menos de 24 horas y no hay registro de caída, está online
          uptimeRecent = timeSinceStart < 86400; // 24 horas
          
          // Calcular uptime
          const uptimeSeconds = uptimeCheck[0].uptime || timeSinceStart;
          const hours = Math.floor(uptimeSeconds / 3600);
          const minutes = Math.floor((uptimeSeconds % 3600) / 60);
          uptimeString = `${hours}h ${minutes}m`;
        }
      } catch (error) {
        console.log('⚠️ [Server] Tabla uptime no disponible, usando método alternativo');
      }

      // El servidor está online si:
      // - Hay jugadores conectados, O
      // - El uptime es reciente
      const isOnline = playersOnline > 0 || uptimeRecent;

      console.log('📊 [Server] Estado:', { 
        online: isOnline, 
        players: playersOnline, 
        uptimeRecent,
        uptime: uptimeString 
      });

      return {
        online: isOnline,
        playersOnline: playersOnline,
        uptime: uptimeString
      };
    } catch (error) {
      console.error('❌ [Server] Error verificando estado:', error);
      return {
        online: false,
        playersOnline: 0,
        uptime: 'Unknown'
      };
    }
  }

  // Obtener estado de los realms
  async getRealmStatus(): Promise<RealmStatus[]> {
    try {
      const [realms] = await authDB.query<RowDataPacket[]>(
        `SELECT id, name, address, port, icon, flag, timezone, allowedSecurityLevel, population, gamebuild 
         FROM realmlist 
         ORDER BY id`
      );

      const status = await this.checkServerOnline();

      return realms.map(realm => ({
        ...realm,
        online: status.online,
        playersOnline: status.playersOnline,
        uptime: status.uptime
      })) as RealmStatus[];
    } catch (error) {
      console.error('❌ [Server] Get realm status error:', error);
      return [];
    }
  }

  // Obtener estadísticas del servidor
  async getServerStats(): Promise<ServerStats> {
    try {
      // Total de cuentas
      const [accountCount] = await authDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM account'
      );
      const totalAccounts = accountCount[0].total;

      // Total de personajes
      const [characterCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM characters'
      );
      const totalCharacters = characterCount[0].total;

      // Personajes online
      const [onlineCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM characters WHERE online = 1'
      );
      const charactersOnline = onlineCount[0].total;

      // Personajes por facción
      const [allianceCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM characters WHERE race IN (1, 3, 4, 7, 11)'
      );
      const allianceCharacters = allianceCount[0].total;

      const [hordeCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM characters WHERE race IN (2, 5, 6, 8, 10)'
      );
      const hordeCharacters = hordeCount[0].total;

      // Personajes nivel máximo
      const [maxLevelCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM characters WHERE level = 80'
      );
      const maxLevel = maxLevelCount[0].total;

      return {
        totalAccounts,
        totalCharacters,
        charactersOnline,
        allianceCharacters,
        hordeCharacters,
        maxLevel
      };
    } catch (error) {
      console.error('❌ [Server] Get server stats error:', error);
      return {
        totalAccounts: 0,
        totalCharacters: 0,
        charactersOnline: 0,
        allianceCharacters: 0,
        hordeCharacters: 0,
        maxLevel: 0
      };
    }
  }

  // Obtener personajes online
  async getOnlineCharacters(limit: number = 50): Promise<any[]> {
    try {
      const [characters] = await charactersDB.query<RowDataPacket[]>(
        `SELECT guid, name, race, class, gender, level, zone, map 
         FROM characters 
         WHERE online = 1 
         ORDER BY level DESC 
         LIMIT ?`,
        [limit]
      );

      return characters;
    } catch (error) {
      console.error('❌ [Server] Get online characters error:', error);
      return [];
    }
  }

  // Verificar si el servidor está online
  async isServerOnline(): Promise<boolean> {
    const status = await this.checkServerOnline();
    return status.online;
  }

  // Obtener información detallada del servidor
  async getDetailedServerInfo(): Promise<any> {
    try {
      const status = await this.checkServerOnline();
      
      return {
        online: status.online,
        players: status.playersOnline,
        uptime: status.uptime,
        serverName: process.env.SERVER_NAME || 'Trinity Server',
        version: process.env.SERVER_VERSION || '3.3.5a',
        rates: {
          xp: parseInt(process.env.SERVER_RATES_XP || '1'),
          gold: parseInt(process.env.SERVER_RATES_GOLD || '1'),
          drop: parseInt(process.env.SERVER_RATES_DROP || '1')
        }
      };
    } catch (error) {
      return {
        online: false,
        serverName: process.env.SERVER_NAME || 'Trinity Server',
        version: process.env.SERVER_VERSION || '3.3.5a',
        rates: {
          xp: parseInt(process.env.SERVER_RATES_XP || '1'),
          gold: parseInt(process.env.SERVER_RATES_GOLD || '1'),
          drop: parseInt(process.env.SERVER_RATES_DROP || '1')
        }
      };
    }
  }
}

export default new ServerService();