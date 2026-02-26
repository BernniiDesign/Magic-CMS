// backend/src/services/auth.service.ts

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authDB } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ✅ RBAC: fuente única de verdad — NO duplicar la lógica aquí
import { getUserPermissions } from '../middleware/rbac.middleware';

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
    permissions: number[];
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
  permissions?: number[];
}

interface DecodedAccessToken {
  id: number;
  username: string;
  email: string;
  permissions: number[];
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

const JWT_SECRET          = process.env.JWT_SECRET         || 'your-secret-key-change-this';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-this';
const ACCESS_TOKEN_EXPIRY  = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// ==================== SRP6 UTILITIES ====================

function bufferToBigIntLE(buffer: Buffer): bigint {
  let result = 0n;
  for (let i = buffer.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(buffer[i]);
  }
  return result;
}

function bigIntToBufferLE(value: bigint, size: number = 32): Buffer {
  const hex    = value.toString(16).padStart(size * 2, '0');
  const buffer = Buffer.from(hex, 'hex');
  const reversed = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    reversed[i] = buffer[buffer.length - 1 - i];
  }
  if (reversed.length < size) {
    return Buffer.concat([reversed, Buffer.alloc(size - reversed.length)]);
  }
  return reversed.slice(0, size);
}

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

function calculateSRP6Verifier(username: string, password: string, salt: Buffer): Buffer {
  const g = 7n;
  const N = BigInt('0x894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7');
  const h1 = crypto
    .createHash('sha1')
    .update(`${username.toUpperCase()}:${password.toUpperCase()}`)
    .digest();
  const h2 = crypto
    .createHash('sha1')
    .update(Buffer.concat([salt, h1]))
    .digest();
  const h2Int    = bufferToBigIntLE(h2);
  const verifier = modPow(g, h2Int, N);
  return bigIntToBufferLE(verifier, 32);
}

function generateSRP6Credentials(username: string, password: string): SRP6Credentials {
  const salt     = crypto.randomBytes(32);
  const verifier = calculateSRP6Verifier(username, password, salt);
  return { salt, verifier };
}

// ==================== AUTH SERVICE ====================

class AuthService {

  // ==================== TOKEN GENERATION ====================

  generateTokenPair(user: UserData): TokenPair {
    const accessToken = jwt.sign(
      {
        id:          user.id,
        username:    user.username,
        email:       user.email,
        permissions: user.permissions ?? [],
        type:        'access',
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        id:      user.id,
        type:    'refresh',
        tokenId: crypto.randomBytes(16).toString('hex'),
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }

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

  async verifyRefreshToken(tokenId: string): Promise<boolean> {
    try {
      const [tokens] = await authDB.query<RowDataPacket[]>(
        `SELECT id FROM refresh_tokens
         WHERE token_id = ? AND expires_at > NOW() AND revoked = 0`,
        [tokenId]
      );
      return tokens.length > 0;
    } catch (error) {
      console.error('❌ [AUTH] Error verificando refresh token:', error);
      return false;
    }
  }

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

  // ==================== REGISTER ====================

  async register(data: RegisterData): Promise<ServiceResponse> {
    try {
      const { username, password, email } = data;

      if (!username || !password || !email) {
        return { success: false, message: 'Missing required fields' };
      }

      const upperUsername = username.toUpperCase();

      const [existingUsers] = await authDB.query<RowDataPacket[]>(
        'SELECT id FROM account WHERE username = ?',
        [upperUsername]
      );
      if (existingUsers.length > 0) {
        return { success: false, message: 'Username already exists' };
      }

      const [existingEmails] = await authDB.query<RowDataPacket[]>(
        'SELECT id FROM account WHERE email = ?',
        [email]
      );
      if (existingEmails.length > 0) {
        return { success: false, message: 'Email already exists' };
      }

      const { salt, verifier } = generateSRP6Credentials(username, password);

      console.log('🔐 [AUTH] Generando credenciales SRP6 para:', upperUsername);

      await authDB.query<ResultSetHeader>(
        `INSERT INTO account (username, salt, verifier, email, joindate, expansion)
         VALUES (?, ?, ?, ?, NOW(), 2)`,
        [upperUsername, salt, verifier, email]
      );

      console.log('✅ [AUTH] Usuario registrado exitosamente:', upperUsername);
      return { success: true, message: 'Account created successfully' };

    } catch (error: any) {
      console.error('❌ [AUTH] Register error:', error);
      return { success: false, message: 'Error creating account' };
    }
  }

  // ==================== LOGIN ====================

  async login(username: string, password: string, ipAddress: string): Promise<LoginResult> {
    try {
      // 1. Rate limiting anti brute-force
      const recentAttempts = await this.getRecentFailedAttempts(ipAddress, username);
      if (recentAttempts >= 5) {
        console.warn('🚨 [AUTH] Demasiados intentos fallidos:', { ipAddress, username });
        throw new Error('Too many failed attempts. Try again in 15 minutes.');
      }

      // 2. Buscar cuenta
      const [users] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email, salt, verifier, locked FROM account WHERE username = ?',
        [username.toUpperCase()]
      );
      if (users.length === 0) {
        await this.logFailedAttempt(ipAddress, username);
        throw new Error('Invalid credentials');
      }

      const user = users[0];

      // 3. Cuenta bloqueada
      if (user.locked === 1) {
        console.warn('🔒 [AUTH] Cuenta bloqueada:', username);
        throw new Error('Account is locked. Contact support.');
      }

      // 4. Verificar contraseña SRP6
      if (!user.salt || !user.verifier) {
        await this.logFailedAttempt(ipAddress, username);
        throw new Error('Invalid credentials');
      }

      const calculatedVerifier = calculateSRP6Verifier(username, password, user.salt);
      const passwordValid = Buffer.compare(calculatedVerifier, user.verifier) === 0;

      console.log('🔐 [AUTH] Verificando login para:', username, '| válido:', passwordValid);

      if (!passwordValid) {
        await this.logFailedAttempt(ipAddress, username);
        throw new Error('Invalid credentials');
      }

      // 5. Consultar permisos RBAC — fuente única: rbac.middleware.ts
      const permissions = await getUserPermissions(user.id);
      console.log(`✅ [AUTH] Permisos de ${username}:`, permissions);

      // 6. Generar tokens (permissions viajan firmados en el access token)
      const { accessToken, refreshToken } = this.generateTokenPair({
        id:       user.id,
        username: user.username,
        email:    user.email,
        permissions,
      });

      // 7. Persistir refresh token
      const decoded   = jwt.decode(refreshToken) as DecodedRefreshToken;
      const expiresAt = new Date(decoded.exp * 1000);
      await this.saveRefreshToken(user.id, decoded.tokenId, expiresAt);

      // 8. Auditoría
      await this.clearFailedAttempts(ipAddress, username);
      await this.logSuccessfulLogin(user.id, ipAddress);

      console.log('✅ [AUTH] Login exitoso para:', username);

      return {
        success:     true,
        message:     'Login successful',
        token:       accessToken, // legacy — mantener hasta deprecar
        accessToken,
        refreshToken,
        user: {
          id:       user.id,
          username: user.username,
          email:    user.email,
          permissions,
        },
      };

    } catch (error: any) {
      console.error('❌ [AUTH] Login error:', error.message);
      return { success: false, message: error.message || 'Error during login' };
    }
  }

  // ==================== REFRESH TOKEN ====================

  /**
   * Al renovar el access token se reconsultan los permisos frescos desde BD.
   * Esto permite que cambios en RBAC se apliquen sin forzar re-login.
   */
  async refreshAccessToken(refreshToken: string): Promise<ServiceResponse> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as DecodedRefreshToken;

      if (decoded.type !== 'refresh') throw new Error('Invalid token type');

      const isValid = await this.verifyRefreshToken(decoded.tokenId);
      if (!isValid) throw new Error('Token has been revoked');

      const [users] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email FROM account WHERE id = ?',
        [decoded.id]
      );
      if (users.length === 0) throw new Error('User not found');

      const user = users[0] as UserData;

      // Permisos frescos — reflejan cambios RBAC sin re-login
      const permissions = await getUserPermissions(user.id);

      const accessToken = jwt.sign(
        {
          id:          user.id,
          username:    user.username,
          email:       user.email,
          permissions,
          type:        'access',
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      console.log('✅ [AUTH] Access token renovado para:', user.username);
      return { success: true, message: 'Token refreshed successfully', accessToken };

    } catch (error: any) {
      console.error('❌ [AUTH] Error renovando token:', error.message);
      return { success: false, message: 'Invalid or expired refresh token' };
    }
  }

  // ==================== VERIFY ====================

  verifyToken(token: string): UserData | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedAccessToken;
      if (decoded.type !== 'access') return null;
      return {
        id:          decoded.id,
        username:    decoded.username,
        email:       decoded.email,
        permissions: decoded.permissions ?? [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Usado por GET /api/auth/me.
   * Siempre consulta permisos frescos desde BD — no depende del JWT.
   */
  async getAccount(accountId: number): Promise<UserData | null> {
    try {
      const [accounts] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email FROM account WHERE id = ?',
        [accountId]
      );
      if (accounts.length === 0) return null;

      const permissions = await getUserPermissions(accountId);

      return {
        ...(accounts[0] as UserData),
        permissions,
      };
    } catch (error) {
      console.error('❌ [AUTH] Error obteniendo cuenta:', error);
      return null;
    }
  }

  // ==================== ANTI BRUTE-FORCE ====================

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

  async logout(refreshToken: string): Promise<ServiceResponse> {
    try {
      const decoded = jwt.decode(refreshToken) as DecodedRefreshToken | null;
      if (!decoded?.tokenId) {
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