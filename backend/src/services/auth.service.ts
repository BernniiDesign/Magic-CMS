import { authDB } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface RegisterData {
  username: string;
  password: string;
  email: string;
}

interface LoginData {
  username: string;
  password: string;
}

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
  
  // Padding a la derecha (no a la izquierda)
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
 * Siguiendo la especificación exacta de TrinityCore
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
function generateSRP6Credentials(username: string, password: string): { salt: Buffer; verifier: Buffer } {
  // Generar salt aleatorio de 32 bytes
  const salt = crypto.randomBytes(32);
  
  // Calcular verifier
  const verifier = calculateSRP6Verifier(username, password, salt);
  
  return { salt, verifier };
}

class AuthService {
  /**
   * Detectar qué tipo de autenticación usa la base de datos
   */
  private async detectAuthType(): Promise<'sha1' | 'srp6'> {
    try {
      const [columns] = await authDB.query<RowDataPacket[]>(
        "SHOW COLUMNS FROM account"
      );
      
      const columnNames = columns.map((col: any) => col.Field.toLowerCase());
      
      // Si tiene 'salt' y 'verifier', usa SRP6
      if (columnNames.includes('salt') && columnNames.includes('verifier')) {
        console.log('🔐 [AUTH] Detectado: SRP6 (salt + verifier)');
        return 'srp6';
      }
      
      // Si tiene 'sha_pass_hash', usa SHA1
      if (columnNames.includes('sha_pass_hash')) {
        console.log('🔐 [AUTH] Detectado: SHA1 (sha_pass_hash)');
        return 'sha1';
      }
      
      // Default a SRP6
      console.log('⚠️ [AUTH] No se pudo detectar tipo, usando SRP6 por defecto');
      return 'srp6';
    } catch (error) {
      console.error('❌ [AUTH] Error detectando tipo:', error);
      return 'srp6';
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(data: RegisterData): Promise<{ success: boolean; message: string }> {
    try {
      const { username, password, email } = data;
      
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
      
      console.log('🔐 [AUTH] Generando credenciales SRP6');
      console.log('  Username:', upperUsername);
      console.log('  Salt length:', salt.length);
      console.log('  Verifier length:', verifier.length);
      
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
      console.error('❌ [AUTH] Error message:', error.message);
      console.error('❌ [AUTH] Error code:', error.code);
      return {
        success: false,
        message: 'Error creating account'
      };
    }
  }

  /**
   * Login de usuario
   */
  async login(data: LoginData): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
    try {
      const { username, password } = data;
      const upperUsername = username.toUpperCase();

      // Buscar usuario
      const [users] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email, salt, verifier FROM account WHERE username = ?',
        [upperUsername]
      );

      if (users.length === 0) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      const user = users[0];

      // Verificar contraseña con SRP6
      if (!user.salt || !user.verifier) {
        console.error('❌ [AUTH] Usuario sin salt/verifier:', username);
        return {
          success: false,
          message: 'Account authentication data missing'
        };
      }

      // Re-calcular verifier usando el salt guardado
      const calculatedVerifier = calculateSRP6Verifier(username, password, user.salt);
      
      // Comparar verifiers
      const passwordValid = Buffer.compare(calculatedVerifier, user.verifier) === 0;
      
      console.log('🔐 [AUTH] Verificando login para:', username);
      console.log('  Salt length:', user.salt.length);
      console.log('  Stored verifier length:', user.verifier.length);
      console.log('  Calculated verifier length:', calculatedVerifier.length);
      console.log('  Password válido:', passwordValid);

      if (!passwordValid) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Generar JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('✅ [AUTH] Login exitoso para:', username);

      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
    } catch (error: any) {
      console.error('❌ [AUTH] Login error:', error);
      return {
        success: false,
        message: 'Error during login'
      };
    }
  }

  /**
   * Verificar token JWT
   */
  async verifyToken(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Verificar que el usuario aún existe
      const [users] = await authDB.query<RowDataPacket[]>(
        'SELECT id, username, email FROM account WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        return { valid: false };
      }

      return {
        valid: true,
        user: users[0]
      };
    } catch (error) {
      return { valid: false };
    }
  }
}

export default new AuthService();