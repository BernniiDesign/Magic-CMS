// backend/src/services/auth.service.ts

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authDB } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ==================== TYPES & INTERFACES ====================

interface RegisterData {
  username: string;
  password: string;
  email: string;
}

interface LoginResult {
  success: boolean;
  message: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserData {
  id: number;
  username: string;
  email: string;
}

interface DecodedAccessToken {
  id: number;
  username: string;
  email: string;
  type: 'access';
  iat: number;
  exp: number;
}

interface DecodedRefreshToken {
  id: number;
  type: 'refresh';
  tokenId: string;
  iat: number;
  exp: number;
}

interface SRP6Credentials {
  salt: Buffer;
  verifier: Buffer;
}

interface ServiceResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  user?: UserData;
}

// ==================== CONSTANTS ====================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-this';
const ACCESS_TOKEN_EXPIRY = '15m'; // Token corto (15 minutos)
const REFRESH_TOKEN_EXPIRY = '7d'; // Token largo (7 días)

// ==================== SRP6 UTILITIES ====================

/**
 * Convierte un Buffer a BigInt en little-endian
 */
function bufferToBigIntLE(buffer: Buffer): bigint {
  let result = 0n;
  for (let i = buffer.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(buffer[i]);
  }
  return result;
}

/**
 * Convierte un BigInt a Buffer en little-endian con padding a la derecha
 */
function bigIntToBufferLE(value: bigint, size: number = 32): Buffer {
  const hex = value.toString(16).padStart(size * 2, '0');
  const buffer = Buffer.from(hex, 'hex');
  
  // Invertir para little-endian
  const reversed = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    reversed[i] = buffer[buffer.length - 1 - i];
  }
  
  // Padding a la derecha
  if (reversed.length < size) {
    return Buffer.concat([reversed, Buffer.alloc(size - reversed.length)]);
  }
  
  return reversed.slice(0, size);
}

/**
 * Función auxiliar para modPow
 */
function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === 1n) return 0n;
  let result = 1n;
  base = base % modulus;
  while (exponent > 0n) {
    if (exponent % 2n === 1n) result = (result * base) % modulus;
    exponent = exponent >> 1n;
    base = (base * base) % modulus;
  }
  return result;
}

/**
 * Calcula salt y verifier para SRP6 (TrinityCore 3.3.5a)
 */
function calculateSRP6Verifier(username: string, password: string, salt: Buffer): Buffer {
  // Constantes de SRP6
  const g = 7n;
  const N = BigInt('0x894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7');
  
  // Paso 1: h1 = SHA1(username:password) en uppercase
  const h1 = crypto
    .createHash('sha1')
    .update(`${username.toUpperCase()}:${password.toUpperCase()}`)
    .digest();
  
  // Paso 2: h2 = SHA1(salt || h1)
  const h2 = crypto
    .createHash('sha1')
    .update(Buffer.concat([salt, h1]))
    .digest();
  
  // Paso 3: Convertir h2 a entero en little-endian
  const h2Int = bufferToBigIntLE(h2);
  
  // Paso 4: Calcular verifier = g^h2 mod N
  const verifier = modPow(g, h2Int, N);
  
  // Paso 5: Convertir verifier a buffer en little-endian con padding a la derecha
  const verifierBuffer = bigIntToBufferLE(verifier, 32);
  
  return verifierBuffer;
}

/**
 * Genera salt y verifier para registro
 */
function generateSRP6Credentials(username: string, password: string): SRP6Credentials {
  const salt = crypto.randomBytes(32);
  const verifier = calculateSRP6Verifier(username, password, salt);
  return { salt, verifier };
}

// ==================== AUTH SERVICE CLASS ====================

class AuthService {
  
  // ==================== GENERACIÓN DE TOKENS ====================
  
  /**
   * Generar par de tokens (access + refresh)
   */
  generateTokenPair(user: UserData): TokenPair {
    // Access token (corto, va en memoria/localStorage)
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Refresh token (largo, va en httpOnly cookie)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
        tokenId: crypto.randomBytes(16).toString('hex') // Para invalidación
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Guardar refresh token en DB (para invalidación)
   */
  async saveRefreshToken(userId: number, tokenId: string, expiresAt: Date): Promise<void> {
    try {
      await authDB.query<ResultSetHeader>(
        `INSERT INTO refresh_tokens (user_id, token_id, expires_at, created_at) 
         VALUES (?, ?, ?, NOW())`,
        [userId, tokenId, expiresAt]
      );
    } catch (error) {
      console.error('❌ [AUTH] Error guardando refresh token:', error);
      throw error;
    }
  }

  /**
   * Verificar si refresh token es válido
   */
  async verifyRefreshToken(tokenId: string): Promise<boolean> {
    try {
      const [tokens] = await authDB.query<RowDataPacket[]>(
        `SELECT * FROM refresh_tokens 
         WHERE token_id = ? AND expires_at > NOW() AND revoked = 0`,
        [tokenId]
      );
      return tokens.length > 0;
    } catch (error) {
      console.error('❌ [AUTH] Error verificando refresh token:', error);
      return false;
    }
  }

  /**
   * Invalidar todos los tokens de un usuario (logout global)
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await authDB.query<ResultSetHeader>(
        `UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`,
        [userId]
      );
      console.log('✅ [AUTH] Tokens revocados para usuario:', userId);
    } catch (error) {
      console.error('❌ [AUTH] Error revocando tokens:', error);
      throw error;
    }
  }

  // ==================== REGISTRO ====================

  /**
   * Registrar nuevo usuario
   */
  async register(data: RegisterData): Promise<ServiceResponse> {
    try {
      const { username, password, email } = data;
      
      // Validación de entrada
      if (!username || !password || !email) {
        return {
          success: false,
          message: 'Missing required fields'
        };
      }

      // Convertir username a mayúsculas (TrinityCore usa uppercase)
      const upperUsername = username.toUpperCase();

      // Verificar si el usuario ya existe
      const [existingUsers] = await authDB.query<RowDataPacket[]>(
        'SELECT id FROM account WHERE username = ?',
        [upperUsername]
      );

      if (existingUsers.length > 0) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }

      // Verificar si el email ya existe
      const [existingEmails] = await authDB.query<RowDataPacket[]>(
        'SELECT id FROM account WHERE email = ?',
        [email]
      );

      if (existingEmails.length > 0) {
        return {
          success: false,
          message: 'Email already exists'
        };
      }

      // Generar credenciales SRP6
      const { salt, verifier } = generateSRP6Credentials(username, password);
      
      console.log('🔐 [AUTH] Generando credenciales SRP6 para:', upperUsername);
      
      await authDB.query<ResultSetHeader>(
        `INSERT INTO account (username, salt, verifier, email, joindate, expansion) 
         VALUES (?, ?, ?, ?, NOW(), 2)`,
        [upperUsername, salt, verifier, email]
      );

      console.log('✅ [AUTH] Usuario registrado exitosamente:', upperUsername);

      return {
        success: true,
        message: 'Account created successfully'
      };
    } catch (error: any) {
      console.error('❌ [AUTH] Register error:', error);
      return {
        success: false,
        message: 'Error creating account'
      };
    }
  }

  // ==================== LOGIN ====================

  /**
   * Login con rate limiting a nivel de servicio
   */
  async login(username: string, password: string, ipAddress: string): Promise<LoginResult> {
    try {
      // 1. Verificar intentos fallidos recientes (prevenir brute force)
      const recentAttempts = await this.getRecentFailedAttempts(ipAddress, username);
      
      if (recentAttempts >= 5) {
        console.warn('🚨 [AUTH] Demasiados intentos fallidos:', { ipAddress, username });
        throw new Error('Too many failed attempts. Try again in 15 minutes.');
      }

      // 2. Buscar usuario
      const [users] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email, salt, verifier, locked FROM account WHERE username = ?',
        [username.toUpperCase()]
      );

      if (users.length === 0) {
        await this.logFailedAttempt(ipAddress, username);
        throw new Error('Invalid credentials');
      }

      const user = users[0];

      // 3. Verificar si la cuenta está bloqueada
      if (user.locked === 1) {
        console.warn('🔒 [AUTH] Cuenta bloqueada:', username);
        throw new Error('Account is locked. Contact support.');
      }

      // 4. Verificar contraseña (SRP6)
      if (!user.salt || !user.verifier) {
        console.error('❌ [AUTH] Usuario sin salt/verifier:', username);
        await this.logFailedAttempt(ipAddress, username);
        throw new Error('Invalid credentials');
      }

      const calculatedVerifier = calculateSRP6Verifier(username, password, user.salt);
      const passwordValid = Buffer.compare(calculatedVerifier, user.verifier) === 0;
      
      console.log('🔐 [AUTH] Verificando login para:', username);
      console.log('  Password válido:', passwordValid);

      if (!passwordValid) {
        await this.logFailedAttempt(ipAddress, username);
        throw new Error('Invalid credentials');
      }

      // 5. Generar tokens
      const { accessToken, refreshToken } = this.generateTokenPair({
        id: user.id,
        username: user.username,
        email: user.email
      });
      
      // 6. Guardar refresh token
      const decoded = jwt.decode(refreshToken) as DecodedRefreshToken;
      const expiresAt = new Date(decoded.exp * 1000);
      await this.saveRefreshToken(user.id, decoded.tokenId, expiresAt);

      // 7. Limpiar intentos fallidos
      await this.clearFailedAttempts(ipAddress, username);

      // 8. Log de login exitoso
      await this.logSuccessfulLogin(user.id, ipAddress);

      console.log('✅ [AUTH] Login exitoso para:', username);

      return {
        success: true,
        message: 'Login successful',
        token: accessToken, // Mantener compatibilidad con código actual
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
    } catch (error: any) {
      console.error('❌ [AUTH] Login error:', error.message);
      return {
        success: false,
        message: error.message || 'Error during login'
      };
    }
  }

  // ==================== REFRESH TOKEN ====================

  /**
   * Renovar access token usando refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<ServiceResponse> {
    try {
      // 1. Verificar que el refresh token sea válido
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as DecodedRefreshToken;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // 2. Verificar que no esté revocado
      const isValid = await this.verifyRefreshToken(decoded.tokenId);
      
      if (!isValid) {
        throw new Error('Token has been revoked');
      }

      // 3. Buscar usuario
      const [users] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email FROM account WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0] as UserData;

      // 4. Generar nuevo access token
      const accessToken = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          type: 'access'
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      console.log('✅ [AUTH] Access token renovado para:', user.username);

      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken
      };
    } catch (error: any) {
      console.error('❌ [AUTH] Error renovando token:', error.message);
      return {
        success: false,
        message: 'Invalid or expired refresh token'
      };
    }
  }

  // ==================== VERIFICACIÓN ====================

  /**
   * Verificar token JWT (mantener compatibilidad con código actual)
   */
  verifyToken(token: string): UserData | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedAccessToken;
      
      if (decoded.type !== 'access') {
        return null;
      }

      return {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener información de cuenta (mantener compatibilidad)
   */
  async getAccount(accountId: number): Promise<UserData | null> {
    try {
      const [accounts] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email, joindate FROM account WHERE id = ?',
        [accountId]
      );

      if (accounts.length === 0) {
        return null;
      }

      return accounts[0] as UserData;
    } catch (error) {
      console.error('❌ [AUTH] Error obteniendo cuenta:', error);
      return null;
    }
  }

  // ==================== ANTI BRUTE-FORCE ====================

  /**
   * Logging de intentos fallidos
   */
  async logFailedAttempt(ipAddress: string, username: string): Promise<void> {
    try {
      await authDB.query<ResultSetHeader>(
        `INSERT INTO login_attempts (ip_address, username, success, timestamp) 
         VALUES (?, ?, 0, NOW())`,
        [ipAddress, username]
      );
    } catch (error) {
      console.error('❌ [AUTH] Error registrando intento fallido:', error);
    }
  }

  /**
   * Obtener intentos fallidos recientes
   */
  async getRecentFailedAttempts(ipAddress: string, username: string): Promise<number> {
    try {
      const [attempts] = await authDB.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM login_attempts 
         WHERE (ip_address = ? OR username = ?) 
         AND success = 0 
         AND timestamp > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
        [ipAddress, username]
      );
      return attempts[0].count as number;
    } catch (error) {
      console.error('❌ [AUTH] Error obteniendo intentos fallidos:', error);
      return 0;
    }
  }

  /**
   * Limpiar intentos fallidos antiguos
   */
  async clearFailedAttempts(ipAddress: string, username: string): Promise<void> {
    try {
      await authDB.query<ResultSetHeader>(
        `DELETE FROM login_attempts 
         WHERE (ip_address = ? OR username = ?) 
         AND timestamp < DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [ipAddress, username]
      );
    } catch (error) {
      console.error('❌ [AUTH] Error limpiando intentos fallidos:', error);
    }
  }

  /**
   * Log de login exitoso (auditoría)
   */
  async logSuccessfulLogin(
    userId: number, 
    ipAddress: string, 
    userAgent: string | null = null
  ): Promise<void> {
    try {
      await authDB.query<ResultSetHeader>(
        `INSERT INTO login_history (user_id, ip_address, user_agent, timestamp) 
         VALUES (?, ?, ?, NOW())`,
        [userId, ipAddress, userAgent]
      );
    } catch (error) {
      console.error('❌ [AUTH] Error registrando login exitoso:', error);
    }
  }

  // ==================== LOGOUT ====================

  /**
   * Logout (revocar refresh token específico)
   */
  async logout(refreshToken: string): Promise<ServiceResponse> {
    try {
      const decoded = jwt.decode(refreshToken) as DecodedRefreshToken | null;
      
      if (!decoded || !decoded.tokenId) {
        return { success: false, message: 'Invalid token' };
      }

      await authDB.query<ResultSetHeader>(
        `UPDATE refresh_tokens SET revoked = 1 WHERE token_id = ?`,
        [decoded.tokenId]
      );

      console.log('✅ [AUTH] Logout exitoso, token revocado');

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('❌ [AUTH] Error en logout:', error);
      return { success: false, message: 'Logout failed' };
    }
  }

  /**
   * Logout global (revocar todos los tokens del usuario)
   */
  async logoutAll(userId: number): Promise<ServiceResponse> {
    try {
      await this.revokeAllUserTokens(userId);
      return { success: true, message: 'All sessions terminated' };
    } catch (error) {
      console.error('❌ [AUTH] Error en logout global:', error);
      return { success: false, message: 'Logout failed' };
    }
  }
}

export default new AuthService();