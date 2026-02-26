// backend/src/middleware/rbac.middleware.ts
//
// RBAC basado en la tabla TrinityCore: auth.rbac_account_permissions
//
// Schema relevante (TrinityCore 3.3.5a):
//   rbac_account_permissions(accountId, permissionId, granted, realmId)
//
// Convención de permisos usada en este CMS:
//   permissionId = 3, granted = 1  → Admin: puede crear/editar news y devblog
//   (usuarios registrados con JWT válido) → pueden crear hilos en el foro
//
// realmId = -1 significa "todos los reinos" (wildcard global en TrinityCore)
// Si el realm específico del servidor tiene otro ID, ajusta REALM_ID en .env

import { Response, NextFunction } from 'express';
import { authDB } from '../config/database';
import { RowDataPacket } from 'mysql2';
import { AuthRequest } from './auth.middleware';

// ID del realm. -1 = global (aplica a todos los reinos)
// Si tu servidor usa un realmId específico, ajusta esta variable.
const REALM_ID = parseInt(process.env.REALM_ID || '-1');

// ── IDs de permisos definidos en tu servidor ────────────────
export const PERMISSION = {
  ADMIN: 3,       // permissionId=3 → crear news, devblog
  // Si en el futuro agregas más niveles, añádelos aquí:
  // GM: 2,
  // MODERATOR: 4,
} as const;

/**
 * Verifica si una cuenta tiene un permiso específico en TrinityCore.
 *
 * La lógica es:
 *   1. Busca permiso exacto para (accountId, permissionId, realmId)
 *   2. Si no encuentra, busca con realmId = -1 (global)
 *   3. granted = 1 → tiene permiso; granted = 0 → explícitamente revocado
 *
 * Se usa authDB porque rbac_account_permissions vive en la base `auth`.
 */
async function hasPermission(accountId: number, permissionId: number): Promise<boolean> {
  try {
    // Consulta que respeta tanto el realmId del servidor como el global (-1)
    // Prioriza el realmId específico sobre el global si ambos existen.
    const [rows] = await authDB.query<RowDataPacket[]>(
      `SELECT granted
       FROM rbac_account_permissions
       WHERE accountId = ?
         AND permissionId = ?
         AND realmId IN (?, -1)
       ORDER BY
         -- Prioriza el realm específico sobre el global
         CASE WHEN realmId = ? THEN 0 ELSE 1 END
       LIMIT 1`,
      [accountId, permissionId, REALM_ID, REALM_ID]
    );

    if (rows.length === 0) return false;

    // granted = 1 → tiene permiso, granted = 0 → revocado explícitamente
    return rows[0].granted === 1;

  } catch (err) {
    console.error('[RBAC] Error consultando rbac_account_permissions:', err);
    // En caso de fallo de BD, denegamos acceso por defecto (fail-closed)
    return false;
  }
}

/**
 * requirePermission(permissionId)
 *
 * Middleware factory. Verifica que el usuario autenticado tenga
 * el permissionId indicado en rbac_account_permissions.
 *
 * Uso:
 *   router.post('/news', authenticateToken, requirePermission(PERMISSION.ADMIN), handler)
 *
 * Requiere que authenticateToken haya corrido antes (req.user debe existir).
 */
export function requirePermission(permissionId: number) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Doble guardia: si el token no fue verificado, 401
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
        code: 'NO_AUTH'
      });
      return;
    }

    const allowed = await hasPermission(req.user.id, permissionId);

    if (!allowed) {
      // 403 y no revelamos qué permiso falta (information disclosure)
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        code: 'FORBIDDEN'
      });
      return;
    }

    next();
  };
}

/**
 * requireAdmin
 *
 * Alias semántico de requirePermission(PERMISSION.ADMIN).
 * Úsalo para rutas de news y devblog.
 *
 * Uso:
 *   router.post('/news', authenticateToken, requireAdmin, handler)
 */
export const requireAdmin = requirePermission(PERMISSION.ADMIN);

/**
 * injectUserPermissions (opcional)
 *
 * Inyecta en req.permissions el set de permisos del usuario actual.
 * Útil para devolver al frontend qué puede hacer sin exponer la tabla RBAC.
 *
 * Uso recomendado: en GET /api/auth/me para que el frontend sepa
 * si debe mostrar los botones "Crear noticia" / "Crear devblog".
 */
export async function injectUserPermissions(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) return next();

  try {
    const [rows] = await authDB.query<RowDataPacket[]>(
      `SELECT permissionId, granted
       FROM rbac_account_permissions
       WHERE accountId = ?
         AND realmId IN (?, -1)
         AND granted = 1`,
      [req.user.id, REALM_ID]
    );

    // Adjunta un Set de permissionIds al objeto user
    (req.user as any).permissions = new Set(rows.map(r => r.permissionId));
  } catch {
    (req.user as any).permissions = new Set();
  }

  next();
}