// backend/src/middleware/rbac.middleware.ts
//
// FUENTE DE VERDAD ÚNICA para RBAC en todo el proyecto.
//
// ❌ NO duplicar esta lógica en:
//    - community.routes.ts  → usar requireAdmin / requirePermission
//    - auth.service.ts      → usar getUserPermissions() de aquí si es necesario
//    - cualquier otro route handler
//
// Schema TrinityCore 3.3.5a (base auth):
//   rbac_account_permissions(accountId INT, permissionId INT, granted TINYINT, realmId INT)
//
// realmId = -1 → permiso global (todos los reinos)
// granted = 1  → permitido
// granted = 0  → revocado explícitamente (tiene precedencia sobre granted=1 global)

import { Response, NextFunction } from 'express';
import { authDB } from '../config/database';
import { RowDataPacket } from 'mysql2';
import { AuthRequest } from './auth.middleware';

const REALM_ID = parseInt(process.env.REALM_ID || '-1');

// ── Mapa canónico de permisos ────────────────────────────────
// Extiende aquí cuando agregues roles nuevos.
// El frontend lee estos IDs desde user.permissions[] en el JWT.
export const PERMISSION = {
  ADMIN:     3,  // Crear/editar news y devblog
  GM:        2,  // Game Master — comandos en servidor
  MODERATOR: 4,  // Moderar foro (futuro)
} as const;

export type PermissionId = typeof PERMISSION[keyof typeof PERMISSION];

// ── Core: consulta RBAC contra TrinityCore ───────────────────
//
// Prioridad de resolución:
//   1. Busca permiso para realmId específico
//   2. Busca permiso para realmId = -1 (global)
//   3. Si granted = 0 en cualquier nivel → revocado
//   4. Sin resultado → denegado (fail-closed)
//
// Esta función es interna. Los middlewares de más abajo son la
// interfaz pública.
export async function hasPermission(
  accountId: number,
  permissionId: number
): Promise<boolean> {
  try {
    const [rows] = await authDB.query<RowDataPacket[]>(
      `SELECT granted
       FROM rbac_account_permissions
       WHERE accountId    = ?
         AND permissionId = ?
         AND realmId IN (?, -1)
       ORDER BY
         CASE WHEN realmId = ? THEN 0 ELSE 1 END  -- realm específico primero
       LIMIT 1`,
      [accountId, permissionId, REALM_ID, REALM_ID]
    );

    if (rows.length === 0) return false;
    return rows[0].granted === 1;

  } catch (err) {
    console.error('[RBAC] Error consultando rbac_account_permissions:', err);
    return false; // fail-closed
  }
}

// ── Consulta todos los permisos de una cuenta ────────────────
// Usado por auth.service.ts para incluirlos en el JWT al login/refresh.
// Exportada para que auth.service la use directamente y no duplique la query.
export async function getUserPermissions(accountId: number): Promise<number[]> {
  try {
    const [rows] = await authDB.query<RowDataPacket[]>(
      `SELECT permissionId
       FROM rbac_account_permissions
       WHERE accountId = ?
         AND realmId IN (?, -1)
         AND granted = 1`,
      [accountId, REALM_ID]
    );
    return rows.map(r => r.permissionId as number);
  } catch (err) {
    console.error('[RBAC] Error consultando permisos de usuario:', err);
    return []; // fail-safe: devuelve vacío, nunca lanza
  }
}

// ── Middleware factory ────────────────────────────────────────
//
// Uso:
//   router.post('/news', authenticateToken, requirePermission(PERMISSION.ADMIN), handler)
//
// IMPORTANTE: authenticateToken debe correr antes.
export function requirePermission(permissionId: number) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
        code: 'NO_AUTH',
      });
      return;
    }

    // Optimización: si los permisos vienen en el JWT, los verificamos
    // localmente sin tocar la BD. Si no, consultamos la BD (fallback).
    const jwtPermissions: number[] | undefined = (req.user as any).permissions;

    let allowed: boolean;

    if (Array.isArray(jwtPermissions)) {
      // Fast path: permisos en el JWT (evita query RBAC)
      allowed = jwtPermissions.includes(permissionId);
    } else {
      // Slow path: consulta fresca a la BD
      allowed = await hasPermission(req.user.id, permissionId);
    }

    if (!allowed) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

// ── Alias semánticos ─────────────────────────────────────────
// Úsalos en las rutas para mayor legibilidad.

/** POST /news, POST /devblog — solo admins */
export const requireAdmin = requirePermission(PERMISSION.ADMIN);

/** Comandos GM — solo GMs */
export const requireGM = requirePermission(PERMISSION.GM);

/** Moderación de foro — solo moderadores (futuro) */
export const requireModerator = requirePermission(PERMISSION.MODERATOR);

// ── Inyector de permisos en req.user ────────────────────────
//
// Middleware opcional. Añade req.user.permissions como Set<number>
// para que los handlers puedan verificar múltiples permisos sin
// múltiples queries a la BD.
//
// Uso recomendado: en rutas que necesitan comprobar permisos
// de forma condicional (no bloqueante), por ejemplo en GET /me.
export async function injectUserPermissions(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) return next();

  try {
    const perms = await getUserPermissions(req.user.id);
    (req.user as any).permissionsSet = new Set(perms);
    (req.user as any).permissions    = perms;
  } catch {
    (req.user as any).permissionsSet = new Set<number>();
    (req.user as any).permissions    = [];
  }

  next();
}