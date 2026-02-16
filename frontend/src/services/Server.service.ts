// frontend/src/services/server.service.ts

import api from './api';

export interface ServerStats {
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

export interface ServerStatus {
  online: boolean;
  onlinePlayers: number;
  maxPlayers: number;
}

class ServerService {
  /**
   * Obtener estadísticas del servidor (requiere auth)
   */
  async getServerStats(): Promise<ServerStats> {
    const response = await api.get('/server/stats');
    return response.data.stats;
  }

  /**
   * Obtener estado del servidor (público)
   */
  async getServerStatus(): Promise<ServerStatus> {
    const response = await api.get('/server/status');
    return response.data.status;
  }
}

export default new ServerService();