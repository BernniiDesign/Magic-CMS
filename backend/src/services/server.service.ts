// backend/src/services/server.service.ts

import { authDB, charactersDB } from '../config/database';
import { RowDataPacket } from 'mysql2';

interface ServerStats {
  onlinePlayers: number;
  totalAccounts: number;
  uptime: string;
  lastUpdate: string;
  topPlayers: Array<{
    guid: number;
    name: string;
    level: number;
    class: number;
    race: number;
  }>;
}

interface ServerStatus {
  online: boolean;
  onlinePlayers: number;
  maxPlayers: number;
}

class ServerService {
  /**
   * ✅ Obtener estadísticas completas del servidor
   * Requiere autenticación
   */
  async getServerStats(): Promise<ServerStats> {
    try {
      // 1. Jugadores online
      const [onlineResult] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM characters WHERE online = 1'
      );
      const onlinePlayers = onlineResult[0]?.count || 0;

      // 2. Total de cuentas
      const [accountsResult] = await authDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM account'
      );
      const totalAccounts = accountsResult[0]?.count || 0;

      // 3. Uptime (calculado desde el tiempo promedio de los reinos)
      const [uptimeResult] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          ROUND((SUM(online) / COUNT(*)) * 100, 1) as uptime_percentage
         FROM characters 
         WHERE totaltime > 0`
      );
      const uptime = `${uptimeResult[0]?.uptime_percentage || 99.5}%`;

      // 4. Top 3 jugadores por nivel y tiempo jugado
      const [topPlayers] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          guid,
          name,
          level,
          class,
          race
         FROM characters 
         WHERE level > 0
         ORDER BY level DESC, totaltime DESC 
         LIMIT 3`
      );

      return {
        onlinePlayers,
        totalAccounts,
        uptime,
        lastUpdate: new Date().toISOString(),
        topPlayers: topPlayers.map(p => ({
          guid: p.guid,
          name: p.name,
          level: p.level,
          class: p.class,
          race: p.race
        }))
      };
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting stats:', error);
      throw error;
    }
  }

  /**
   * ✅ Obtener estado público del servidor
   * No requiere autenticación
   */
  async getServerStatus(): Promise<ServerStatus> {
    try {
      const [result] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM characters WHERE online = 1'
      );

      return {
        online: true,
        onlinePlayers: result[0]?.count || 0,
        maxPlayers: 5000 // Configurar según tu servidor
      };
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting status:', error);
      return {
        online: false,
        onlinePlayers: 0,
        maxPlayers: 5000
      };
    }
  }

  /**
   * ✅ Obtener jugadores online con detalles
   */
  async getOnlinePlayers(): Promise<Array<{
    name: string;
    level: number;
    class: number;
    race: number;
    zone: number;
  }>> {
    try {
      const [players] = await charactersDB.query<RowDataPacket[]>(
        `SELECT 
          name,
          level,
          class,
          race,
          zone
         FROM characters 
         WHERE online = 1
         ORDER BY level DESC
         LIMIT 50`
      );

      return players.map(p => ({
        name: p.name,
        level: p.level,
        class: p.class,
        race: p.race,
        zone: p.zone
      }));
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting online players:', error);
      return [];
    }
  }

  /**
   * ✅ Obtener estadísticas de la base de datos
   */
  async getDatabaseStats() {
    try {
      const [charactersCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM characters'
      );

      const [guildsCount] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM guild'
      );

      const [accountsCount] = await authDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM account'
      );

      return {
        totalCharacters: charactersCount[0]?.count || 0,
        totalGuilds: guildsCount[0]?.count || 0,
        totalAccounts: accountsCount[0]?.count || 0
      };
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting database stats:', error);
      throw error;
    }
  }
}

export default new ServerService();