// backend/src/routes/community.routes.ts
// authorName se toma del JWT (req.user.username) → sin JOIN cross-DB

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import communityService from '../services/community.service';

const router = Router();

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
    res.json({ success: true,
      ...(await communityService.getThreadsByCategory(parseInt(req.params.categoryId), page, limit)) });
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
    const { categoryId, title, content } = req.body;
    if (!categoryId || !title?.trim() || !content?.trim())
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    const thread = await communityService.createThread({
      categoryId, title, content,
      authorId:   req.user!.id,
      authorName: req.user!.username,   // ← del JWT, no cross-DB
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
    const page = parseInt(req.query.page as string) || 1;
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

router.post('/news', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, summary, tags } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    const news = await communityService.createNews({
      title, content, summary: summary || '', tags: tags || '',
      authorId: req.user!.id, authorName: req.user!.username,
    });
    res.status(201).json({ success: true, news });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

// ── DEVBLOG ────────────────────────────────────────────────

router.get('/devblog', optionalAuth, async (req, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
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

router.post('/devblog', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, summary, tags } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    const post = await communityService.createDevBlogPost({
      title, content, summary: summary || '', tags: tags || '',
      authorId: req.user!.id, authorName: req.user!.username,
    });
    res.status(201).json({ success: true, post });
  } catch { res.status(500).json({ success: false, message: 'Error interno' }); }
});

export default router;