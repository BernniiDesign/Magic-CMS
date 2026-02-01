import net from 'net';

interface RAConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface RAResponse {
  success: boolean;
  message: string;
  data?: any;
}

class RAService {
  private config: RAConfig;

  constructor() {
    this.config = {
      host: process.env.RA_HOST || 'localhost',
      port: parseInt(process.env.RA_PORT || '3443'),
      username: process.env.RA_USER || 'admin',
      password: process.env.RA_PASSWORD || 'admin',
    };
  }

  /**
   * Ejecuta un comando en el servidor via RA
   */
  async executeCommand(command: string): Promise<RAResponse> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let buffer = '';
    let authenticated = false;

    console.log('🔌 [RA] Conectando a', this.config.host + ':' + this.config.port);
    
    // Timeout de 30 segundos
    client.setTimeout(30000);

    client.on('timeout', () => {
      console.error('⏱️ [RA] TIMEOUT - Buffer actual:', buffer);
      client.destroy();
      reject({
        success: false,
        message: 'Connection timeout'
      });
    });

    client.on('error', (error) => {
      console.error('❌ [RA] Error de socket:', error);
      reject({
        success: false,
        message: `Connection error: ${error.message}`
      });
    });

    client.on('data', (data) => {
      const received = data.toString();
      buffer += received;
      console.log('📨 [RA] Recibido:', JSON.stringify(received));
      console.log('📦 [RA] Buffer completo:', JSON.stringify(buffer));

      // Esperando usuario
      if (buffer.includes('Username:') && !authenticated) {
        console.log('👤 [RA] Enviando username:', this.config.username);
        client.write(this.config.username + '\n');
        buffer = '';
      }
      // Esperando contraseña
      else if (buffer.includes('Password:') && !authenticated) {
        console.log('🔑 [RA] Enviando password');
        client.write(this.config.password + '\n');
        buffer = '';
      }
      // Autenticación exitosa
      else if (buffer.includes('TC>') && !authenticated) {
        console.log('✅ [RA] Autenticado! Enviando comando:', command);
        authenticated = true;
        // Enviar comando
        client.write(command + '\n');
        buffer = '';
      }
      // Respuesta del comando
      else if (authenticated && buffer.includes('TC>')) {
        console.log('📊 [RA] Respuesta recibida');
        // Limpiar respuesta
        const response = buffer
          .replace(/TC>/g, '')
          .replace(/\r\n/g, '\n')
          .trim();

        client.destroy();
        resolve({
          success: true,
          message: 'Command executed successfully',
          data: response
        });
      }
    });

    client.on('close', () => {
      console.log('🔌 [RA] Conexión cerrada. Autenticado:', authenticated);
      if (!authenticated) {
        reject({
          success: false,
          message: 'Authentication failed'
        });
      }
    });

    // Conectar al servidor
    client.connect(this.config.port, this.config.host, () => {
      console.log('✅ [RA] Socket conectado');
    });
  });
}

  /**
   * Obtiene el estado del servidor
   */
  async getServerStatus(): Promise<RAResponse> {
  try {
    console.log('🔍 [RA] Intentando conectar a RA...', this.config);
    const result = await this.executeCommand('server info');
    console.log('✅ [RA] Comando ejecutado exitosamente:', result);
    
    // Parsear información del servidor
    const lines = result.data.split('\n');
    const info: any = {
      online: true,
      uptime: '',
      players: 0,
      maxPlayers: 0,
      version: '',
    };

lines.forEach((line: string) => {
  // Buscar tanto "Connected players" como "Online players"
  if (line.includes('Connected players:') || line.includes('Online players:')) {
    // Buscar cualquier patrón de números
    const match = line.match(/(\d+)/g);
    if (match && match.length >= 1) {
      info.players = parseInt(match[0]);
      if (match.length >= 2) {
        info.maxPlayers = parseInt(match[1]);
      }
    }
  }
    });

    console.log('📊 [RA] Info parseada:', info);

    return {
      success: true,
      message: 'Server is online',
      data: info
    };
  } catch (error: any) {
    console.error('❌ [RA] Error obteniendo estado:', error);
    return {
      success: false,
      message: 'Server is offline',
      data: {
        online: false,
        error: error.message
      }
    };
  }
}

  /**
   * Obtiene la cantidad de jugadores online
   */
  async getOnlinePlayersCount(): Promise<number> {
    try {
      const result = await this.executeCommand('server info');
      const match = result.data.match(/Connected players: (\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Envía un anuncio al servidor
   */
  async sendAnnouncement(message: string): Promise<RAResponse> {
    try {
      const result = await this.executeCommand(`announce ${message}`);
      return {
        success: true,
        message: 'Announcement sent',
        data: result.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Envía items por correo a un jugador
   */
  async sendItemByMail(
    characterName: string,
    subject: string,
    body: string,
    itemId: number,
    quantity: number = 1
  ): Promise<RAResponse> {
    try {
      const command = `send items ${characterName} "${subject}" "${body}" ${itemId}:${quantity}`;
      const result = await this.executeCommand(command);
      return {
        success: true,
        message: 'Items sent successfully',
        data: result.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Envía dinero por correo a un jugador
   */
  async sendMoneyByMail(
    characterName: string,
    subject: string,
    body: string,
    gold: number
  ): Promise<RAResponse> {
    try {
      const copper = gold * 10000; // Convertir oro a cobre
      const command = `send money ${characterName} "${subject}" "${body}" ${copper}`;
      const result = await this.executeCommand(command);
      return {
        success: true,
        message: 'Money sent successfully',
        data: result.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Kickea a un jugador del servidor
   */
  async kickPlayer(characterName: string, reason: string = ''): Promise<RAResponse> {
    try {
      const command = reason 
        ? `kick ${characterName} ${reason}`
        : `kick ${characterName}`;
      const result = await this.executeCommand(command);
      return {
        success: true,
        message: 'Player kicked',
        data: result.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Banea una cuenta
   */
  async banAccount(
    accountName: string,
    duration: string,
    reason: string
  ): Promise<RAResponse> {
    try {
      const command = `ban account ${accountName} ${duration} ${reason}`;
      const result = await this.executeCommand(command);
      return {
        success: true,
        message: 'Account banned',
        data: result.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Desbanea una cuenta
   */
  async unbanAccount(accountName: string): Promise<RAResponse> {
    try {
      const command = `unban account ${accountName}`;
      const result = await this.executeCommand(command);
      return {
        success: true,
        message: 'Account unbanned',
        data: result.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Verifica si el servidor está online
   */
  async isServerOnline(): Promise<boolean> {
    try {
      await this.getServerStatus();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new RAService();
