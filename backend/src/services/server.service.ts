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
   * GET /api/server/stats
   * Estadísticas completas del servidor (requiere autenticación)
   * auth       → COUNT de cuentas
   * characters → jugadores online, top players
   */
  async getServerStats(): Promise<ServerStats> {
    try {
      // 1. Jugadores online — characters DB
      const [onlineResult] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM characters WHERE online = 1'
      );
      const onlinePlayers = onlineResult[0]?.count || 0;

      // 2. Total de cuentas — auth DB (única razón para tocar auth aquí)
      const [accountsResult] = await authDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM account'
      );
      const totalAccounts = accountsResult[0]?.count || 0;

      // 3. Uptime calculado desde el campo online de characters
      const [uptimeResult] = await charactersDB.query<RowDataPacket[]>(
        `SELECT ROUND((SUM(online) / COUNT(*)) * 100, 1) as uptime_percentage
         FROM characters WHERE totaltime > 0`
      );
      const uptime = `${uptimeResult[0]?.uptime_percentage || 99.5}%`;

      // 4. Top 3 jugadores por nivel y tiempo jugado — characters DB
      const [topPlayers] = await charactersDB.query<RowDataPacket[]>(
        `SELECT guid, name, level, class, race
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
          guid:  p.guid,
          name:  p.name,
          level: p.level,
          class: p.class,
          race:  p.race,
        })),
      };
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting stats:', error);
      throw error;
    }
  }

  /**
   * GET /api/server/status
   * Estado público del servidor (no requiere autenticación)
   */
  async getServerStatus(): Promise<ServerStatus> {
    try {
      const [result] = await charactersDB.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM characters WHERE online = 1'
      );
      return {
        online: true,
        onlinePlayers: result[0]?.count || 0,
        maxPlayers: parseInt(process.env.SERVER_MAX_PLAYERS || '5000'),
      };
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting status:', error);
      return { online: false, onlinePlayers: 0, maxPlayers: 5000 };
    }
  }

  /**
   * GET /api/server/top-killers
   * Top personajes por kills — usado por CommunitySidebar
   * Intenta primero character_kill_stats, fallback a columna kills nativa
   */
  async getTopKillers(limit = 5): Promise<Array<{
    guid: number;
    name: string;
    level: number;
    class: number;
    race: number;
    totalKills: number;
  }>> {
    try {
      // Intento 1: tabla character_kill_stats si existe en tu core
      const [rows] = await charactersDB.query<RowDataPacket[]>(
        `SELECT c.guid, c.name, c.level, c.class, c.race,
                COALESCE(ks.totalKills, 0) AS totalKills
         FROM characters c
         INNER JOIN character_kill_stats ks ON ks.guid = c.guid
         WHERE ks.totalKills > 0
         ORDER BY ks.totalKills DESC
         LIMIT ?`,
        [limit]
      );
      return rows.map(r => ({
        guid: r.guid, name: r.name, level: r.level,
        class: r.class, race: r.race, totalKills: r.totalKills,
      }));
    } catch {
      // Fallback: columna kills nativa de TrinityCore (characters.kills)
      try {
        const [rows] = await charactersDB.query<RowDataPacket[]>(
          `SELECT guid, name, level, class, race, kills AS totalKills
           FROM characters
           WHERE kills > 0
           ORDER BY kills DESC
           LIMIT ?`,
          [limit]
        );
        return rows.map(r => ({
          guid: r.guid, name: r.name, level: r.level,
          class: r.class, race: r.race, totalKills: r.totalKills,
        }));
      } catch {
        return [];
      }
    }
  }

  /**
   * Jugadores online con detalle de zona
   */
  async getOnlinePlayers(): Promise<Array<{
    name: string; level: number; class: number; race: number; zone: number;
  }>> {
    try {
      const [players] = await charactersDB.query<RowDataPacket[]>(
        `SELECT name, level, class, race, zone
         FROM characters
         WHERE online = 1
         ORDER BY level DESC
         LIMIT 50`
      );
      return players.map(p => ({
        name: p.name, level: p.level, class: p.class,
        race: p.race, zone: p.zone,
      }));
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting online players:', error);
      return [];
    }
  }

  /**
   * Estadísticas generales de la DB (personajes, guilds, cuentas)
   */
  async getDatabaseStats() {
    try {
      const [[chars]]   = await charactersDB.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM characters');
      const [[guilds]]  = await charactersDB.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM guild');
      const [[accounts]] = await authDB.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM account');

      return {
        totalCharacters: chars.count   || 0,
        totalGuilds:     guilds.count  || 0,
        totalAccounts:   accounts.count || 0,
      };
    } catch (error) {
      console.error('❌ [SERVER SERVICE] Error getting database stats:', error);
      throw error;
    }
  }
}

export default new ServerService();