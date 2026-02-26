// frontend/src/hooks/usePermissions.ts

import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

export const PERMISSION = {
  ADMIN: 3,
} as const;

interface PermissionSet {
  isAdmin: boolean;
  canCreateNews: boolean;
  canCreateDevBlog: boolean;
  canCreateThread: boolean;
}

export function usePermissions(): PermissionSet {
  const { isAuthenticated, user } = useAuthStore();

  return useMemo(() => {
    if (!isAuthenticated || !user) {
      return {
        isAdmin:          false,
        canCreateNews:    false,
        canCreateDevBlog: false,
        canCreateThread:  false,
      };
    }

    // permissions es number[] en el User del store — ya no necesita cast
    const permSet = new Set(user.permissions ?? []);
    const isAdmin = permSet.has(PERMISSION.ADMIN);

    return {
      isAdmin,
      canCreateNews:    isAdmin,
      canCreateDevBlog: isAdmin,
      canCreateThread:  true,
    };
  }, [isAuthenticated, user]);
}


// ============================================================
// CAMBIO REQUERIDO EN: backend/src/services/auth.service.ts
// (en el método que devuelve los datos del usuario al login/me)
//
// Añadir la consulta de permisos al devolver el usuario:
//
//   // Tras obtener el account de auth.account:
//   const [permRows] = await authDB.query(
//     `SELECT permissionId
//      FROM rbac_account_permissions
//      WHERE accountId = ?
//        AND realmId IN (?, -1)
//        AND granted = 1`,
//     [account.id, REALM_ID]
//   );
//
//   const permissions = permRows.map((r: any) => r.permissionId);
//
//   // Incluir en el JWT payload y en la respuesta:
//   const tokenPayload = {
//     id: account.id,
//     username: account.username,
//     email: account.email,
//     permissions,   // ← array de permissionIds
//     type: 'access'
//   };
//
//   // Y en la respuesta de /api/auth/me:
//   res.json({
//     success: true,
//     user: {
//       id: account.id,
//       username: account.username,
//       email: account.email,
//       permissions,  // ← el frontend lo lee aquí
//     }
//   });
// ============================================================


// ============================================================
// USO EN Forum.tsx — mostrar botón "Nuevo Hilo" solo si puede
// ============================================================
//
// ANTES (solo comprobaba isAuthenticated):
//   const { isAuthenticated } = useAuthStore();
//   {isAuthenticated && <Link to="/forum/new">Nuevo Hilo</Link>}
//
// DESPUÉS (igual — cualquier autenticado puede crear hilos):
//   const { canCreateThread } = usePermissions();
//   {canCreateThread && <Link to="/forum/new">Nuevo Hilo</Link>}
//
//
// USO EN News.tsx — mostrar botón "Nueva Noticia" solo si isAdmin
// ============================================================
//
//   const { canCreateNews } = usePermissions();
//   {canCreateNews && <Link to="/news/new">Nueva Noticia</Link>}
//
//
// USO EN DevBlog.tsx — mostrar botón "Nuevo Post" solo si isAdmin
// ============================================================
//
//   const { canCreateDevBlog } = usePermissions();
//   {canCreateDevBlog && <Link to="/devblog/new">Nuevo Dev Post</Link>}
// ============================================================