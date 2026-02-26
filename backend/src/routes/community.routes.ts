// backend/src/routes/community.routes.ts
// authorName se toma del JWT (req.user.username) → sin JOIN cross-DB
//
// PERMISOS:
//   POST /news    → requiere permissionId=3 en rbac_account_permissions
//   POST /devblog → requiere permissionId=3 en rbac_account_permissions
//   POST /forums/thread → cualquier usuario autenticado
//
// La verificación RBAC es inline para no depender de archivos externos.

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import { authDB } from '../config/database';
import { RowDataPacket } from 'mysql2';
import communityService from '../services/community.service';

const router = Router();

// ── Helper: verificar permiso RBAC ──────────────────────────
// Consulta auth.rbac_account_permissions directamente.
// realmId IN (REALM_ID, -1) para soportar permisos globales.
const REALM_ID = parseInt(process.env.REALM_ID || '-1');

async function checkPermission(accountId: number, permissionId: number): Promise<boolean> {
  try {
    const [rows] = await authDB.query<RowDataPacket[]>(
      `SELECT granted
       FROM rbac_account_permissions
       WHERE accountId = ?
         AND permissionId = ?
         AND realmId IN (?, -1)
         AND granted = 1
       LIMIT 1`,
      [accountId, permissionId, REALM_ID]
    );
    return rows.length > 0 && rows[0].granted === 1;
  } catch {
    return false; // fail-closed: si la BD falla, deniega
  }
}

// ── FOROS ──────────────────────────────────────────────────

router.get('/forums', optionalAuth, async (_req, res: Response) => {
  try {
    res.json({ success: true, categories: await communityService.getForumCategories() });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

router.get('/forums/:categoryId/threads', optionalAuth, async (req, res: Response) => {
  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    res.json({
      success: true,
      ...(await communityService.getThreadsByCategory(parseInt(req.params.categoryId), page, limit)),
    });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

router.get('/forums/thread/:threadId', optionalAuth, async (req, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const data = await communityService.getThreadWithReplies(parseInt(req.params.threadId), page);
    if (!data) return res.status(404).json({ success: false, message: 'Hilo no encontrado' });
    res.json({ success: true, thread: data });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

router.post('/forums/thread', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, title, content } = req.body;  // ← acepta camelCase del frontend
    if (!categoryId || !title?.trim() || !content?.trim())
      return res.status(400).json({ success: false, message: 'Datos incompletos' });

    const thread = await communityService.createThread({
      categoryId,  // ← pasa directo (el servicio ya usa camelCase)
      title, 
      content,
      authorId:   req.user!.id,
      authorName: req.user!.username,
    });
    res.status(201).json({ success: true, thread });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

router.post('/forums/thread/:threadId/reply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ success: false, message: 'Contenido requerido' });

    const reply = await communityService.createReply({
      threadId:   parseInt(req.params.threadId),
      content,
      authorId:   req.user!.id,
      authorName: req.user!.username,
    });
    res.status(201).json({ success: true, reply });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

// ── NOTICIAS ───────────────────────────────────────────────

router.get('/news', optionalAuth, async (req, res: Response) => {
  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    res.json({ success: true, ...(await communityService.getNews(page, limit)) });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

router.get('/news/:slug', optionalAuth, async (req, res: Response) => {
  try {
    const news = await communityService.getNewsBySlug(req.params.slug);
    if (!news) return res.status(404).json({ success: false, message: 'No encontrada' });
    res.json({ success: true, news });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

// POST /news — requiere JWT + permissionId=3
router.post('/news', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = await checkPermission(req.user!.id, 3);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para crear noticias' });
    }

    const { title, content, summary, tags } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ success: false, message: 'Título y contenido son obligatorios' });

    const news = await communityService.createNews({
      title, content,
      summary:    summary    || '',
      tags:       tags       || '',
      authorId:   req.user!.id,
      authorName: req.user!.username,
    });
    res.status(201).json({ success: true, news });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

// ── DEVBLOG ────────────────────────────────────────────────

router.get('/devblog', optionalAuth, async (req, res: Response) => {
  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    res.json({ success: true, ...(await communityService.getDevBlogPosts(page, limit)) });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

router.get('/devblog/:slug', optionalAuth, async (req, res: Response) => {
  try {
    const post = await communityService.getDevBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, post });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

// POST /devblog — requiere JWT + permissionId=3
router.post('/devblog', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = await checkPermission(req.user!.id, 3);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para publicar en el dev blog' });
    }

    const { title, content, summary, tags } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ success: false, message: 'Título y contenido son obligatorios' });

    const post = await communityService.createDevBlogPost({
      title, content,
      summary:    summary    || '',
      tags:       tags       || '',
      authorId:   req.user!.id,
      authorName: req.user!.username,
    });
    res.status(201).json({ success: true, post });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

export default router;