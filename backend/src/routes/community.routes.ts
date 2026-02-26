// backend/src/routes/community.routes.ts
//
// RBAC: importado de rbac.middleware.ts — NO duplicar aquí.
//
// Permisos:
//   POST /news      → requireAdmin (permissionId = 3)
//   POST /devblog   → requireAdmin (permissionId = 3)
//   POST /forums/*  → authenticateToken (cualquier cuenta registrada)

import { Router, Response } from 'express';
import {
  authenticateToken,
  AuthRequest,
  optionalAuth,
} from '../middleware/auth.middleware';
import {
  requireAdmin,
} from '../middleware/rbac.middleware';
import communityService from '../services/community.service';

const router = Router();

// ═══════════════════════════════════════════════════════════
// FOROS
// ═══════════════════════════════════════════════════════════

// GET /community/forums — lista de categorías (público)
router.get('/forums', optionalAuth, async (_req, res: Response) => {
  try {
    const categories = await communityService.getForumCategories();
    res.json({ success: true, categories });
  } catch (err) {
    console.error('[community] GET /forums', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// GET /community/forums/:categoryId/threads — hilos de una categoría (público)
router.get('/forums/:categoryId/threads', optionalAuth, async (req, res: Response) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit      = Math.min(50, parseInt(req.query.limit as string) || 20);
    const categoryId = parseInt(req.params.categoryId);

    if (isNaN(categoryId) || categoryId < 1) {
      return res.status(400).json({ success: false, message: 'categoryId inválido' });
    }

    const data = await communityService.getThreadsByCategory(categoryId, page, limit);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[community] GET /forums/:categoryId/threads', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// GET /community/forums/thread/:threadId — hilo con respuestas (público)
// NOTA: esta ruta debe registrarse ANTES de /:categoryId/threads
// para que Express no interprete "thread" como un categoryId.
router.get('/forums/thread/:threadId', optionalAuth, async (req, res: Response) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page as string) || 1);
    const threadId = parseInt(req.params.threadId);

    if (isNaN(threadId) || threadId < 1) {
      return res.status(400).json({ success: false, message: 'threadId inválido' });
    }

    const data = await communityService.getThreadWithReplies(threadId, page);
    if (!data) return res.status(404).json({ success: false, message: 'Hilo no encontrado' });

    res.json({ success: true, thread: data });
  } catch (err) {
    console.error('[community] GET /forums/thread/:threadId', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// POST /community/forums/thread — crear hilo (cualquier usuario autenticado)
router.post('/forums/thread', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, title, content } = req.body;

    if (!categoryId || !title?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'categoryId, título y contenido son obligatorios' });
    }
    if (title.trim().length < 5 || title.trim().length > 200) {
      return res.status(400).json({ success: false, message: 'El título debe tener entre 5 y 200 caracteres' });
    }
    if (content.trim().length < 10 || content.trim().length > 10000) {
      return res.status(400).json({ success: false, message: 'El contenido debe tener entre 10 y 10.000 caracteres' });
    }

    const thread = await communityService.createThread({
      categoryId: parseInt(categoryId),
      title:      title.trim(),
      content:    content.trim(),
      authorId:   req.user!.id,
    });

    res.status(201).json({ success: true, thread });
  } catch (err) {
    console.error('[community] POST /forums/thread', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// POST /community/forums/thread/:threadId/reply — responder hilo (autenticado)
router.post('/forums/thread/:threadId/reply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const threadId = parseInt(req.params.threadId);

    if (isNaN(threadId) || threadId < 1) {
      return res.status(400).json({ success: false, message: 'threadId inválido' });
    }
    if (!content?.trim() || content.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Contenido requerido (mínimo 2 caracteres)' });
    }

    const reply = await communityService.createReply({
      threadId,
      content:  content.trim(),
      authorId: req.user!.id,
    });

    res.status(201).json({ success: true, reply });
  } catch (err) {
    console.error('[community] POST /forums/thread/:threadId/reply', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// ═══════════════════════════════════════════════════════════
// NOTICIAS
// ═══════════════════════════════════════════════════════════

// GET /community/news (público)
router.get('/news', optionalAuth, async (req, res: Response) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
    const data  = await communityService.getNews(page, limit);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[community] GET /news', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// GET /community/news/:slug (público)
router.get('/news/:slug', optionalAuth, async (req, res: Response) => {
  try {
    const news = await communityService.getNewsBySlug(req.params.slug);
    if (!news) return res.status(404).json({ success: false, message: 'Noticia no encontrada' });
    res.json({ success: true, news });
  } catch (err) {
    console.error('[community] GET /news/:slug', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// POST /community/news — crear noticia (solo ADMIN)
router.post('/news', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, summary, tags, cover_image, is_published } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'Título y contenido son obligatorios' });
    }

    const news = await communityService.createNews({
      title:        title.trim(),
      content:      content.trim(),
      summary:      summary?.trim()     || '',
      tags:         tags?.trim()        || '',
      cover_image:  cover_image?.trim() || '',
      is_published: is_published ?? 1,
      authorId:     req.user!.id,
    });

    res.status(201).json({ success: true, news });
  } catch (err) {
    console.error('[community] POST /news', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// PUT /community/news/:id — editar noticia (solo ADMIN)
router.put('/news/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'id inválido' });

    const updated = await communityService.updateNews(id, req.body);
    res.json({ success: true, news: updated });
  } catch (err) {
    console.error('[community] PUT /news/:id', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// DELETE /community/news/:id (solo ADMIN)
router.delete('/news/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'id inválido' });

    await communityService.deleteNews(id);
    res.json({ success: true });
  } catch (err) {
    console.error('[community] DELETE /news/:id', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// ═══════════════════════════════════════════════════════════
// DEVBLOG
// ═══════════════════════════════════════════════════════════

// GET /community/devblog (público)
router.get('/devblog', optionalAuth, async (req, res: Response) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
    const data  = await communityService.getDevBlogPosts(page, limit);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[community] GET /devblog', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// GET /community/devblog/:slug (público)
router.get('/devblog/:slug', optionalAuth, async (req, res: Response) => {
  try {
    const post = await communityService.getDevBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    res.json({ success: true, post });
  } catch (err) {
    console.error('[community] GET /devblog/:slug', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// POST /community/devblog — crear post (solo ADMIN)
router.post('/devblog', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, summary, tags, cover_image, is_published } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'Título y contenido son obligatorios' });
    }

    const post = await communityService.createDevBlogPost({
      title:        title.trim(),
      content:      content.trim(),
      summary:      summary?.trim()     || '',
      tags:         tags?.trim()        || '',
      cover_image:  cover_image?.trim() || '',
      is_published: is_published ?? 1,
      authorId:     req.user!.id,
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error('[community] POST /devblog', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// PUT /community/devblog/:id (solo ADMIN)
router.put('/devblog/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'id inválido' });

    const updated = await communityService.updateDevBlogPost(id, req.body);
    res.json({ success: true, post: updated });
  } catch (err) {
    console.error('[community] PUT /devblog/:id', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// DELETE /community/devblog/:id (solo ADMIN)
router.delete('/devblog/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'id inválido' });

    await communityService.deleteDevBlogPost(id);
    res.json({ success: true });
  } catch (err) {
    console.error('[community] DELETE /devblog/:id', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;