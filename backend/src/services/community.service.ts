// backend/src/services/community.service.ts
//
// DB: cms → foros, noticias, devblog
//
// NOTA: author_name NO existe en las tablas del foro.
// El username se resuelve en el frontend vía JOIN o desde el JWT.
// Los tipos reflejan exactamente lo que se inserta en BD.

import { cmsDB } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ── Helpers ──────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200)
    + '-' + Date.now().toString(36);
}

// ── Tipos internos ───────────────────────────────────────────

interface CreateThreadData {
  categoryId: number;
  title:      string;
  content:    string;
  authorId:   number;
  // authorName eliminado — columna no existe en forum_threads
}

interface CreateReplyData {
  threadId: number;
  content:  string;
  authorId: number;
  // authorName eliminado — columna no existe en forum_replies
}

interface CreateNewsData {
  title:        string;
  content:      string;
  summary:      string;
  tags:         string;
  cover_image:  string;
  is_published: number;
  authorId:     number;
}

interface CreateDevBlogData {
  title:        string;
  content:      string;
  summary:      string;
  tags:         string;
  cover_image:  string;
  is_published: number;
  authorId:     number;
}

// ── Service ──────────────────────────────────────────────────

class CommunityService {

  // ═══════════════════════════════════════════════════════════
  // FOROS
  // ═══════════════════════════════════════════════════════════

  async getForumCategories() {
    // Usa COUNT(*) via JOIN — no requiere columna thread_count desnormalizada.
    // Si la columna existe, el UPDATE en createThread la mantiene actualizada,
    // pero la query siempre devuelve el valor real.
    const [rows] = await cmsDB.query<RowDataPacket[]>(`
      SELECT
        fc.*,
        COUNT(ft.id) AS thread_count
      FROM forum_categories fc
      LEFT JOIN forum_threads ft ON ft.category_id = fc.id
      WHERE fc.is_active = 1
      GROUP BY fc.id
      ORDER BY fc.\`order\` ASC
    `);
    return rows;
  }

  async getThreadsByCategory(categoryId: number, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [[{ count }]] = await cmsDB.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM forum_threads WHERE category_id = ?',
      [categoryId]
    );

    const [threads] = await cmsDB.query<RowDataPacket[]>(`
      SELECT *
      FROM forum_threads
      WHERE category_id = ?
      ORDER BY is_pinned DESC, last_reply_at DESC
      LIMIT ? OFFSET ?
    `, [categoryId, limit, offset]);

    return {
      threads,
      total:      count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getThreadWithReplies(threadId: number, page: number) {
    const limit  = 15;
    const offset = (page - 1) * limit;

    // Incrementar vistas (fire-and-forget, no bloquea la respuesta)
    cmsDB.execute(
      'UPDATE forum_threads SET views = views + 1 WHERE id = ?',
      [threadId]
    ).catch(err => console.error('[community] Error incrementando views:', err));

    const [threadRows] = await cmsDB.query<RowDataPacket[]>(
      'SELECT * FROM forum_threads WHERE id = ?',
      [threadId]
    );
    if (!threadRows.length) return null;

    const [replies] = await cmsDB.query<RowDataPacket[]>(`
      SELECT *
      FROM forum_replies
      WHERE thread_id = ? AND is_deleted = 0
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `, [threadId, limit, offset]);

    const [[{ count }]] = await cmsDB.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM forum_replies WHERE thread_id = ? AND is_deleted = 0',
      [threadId]
    );

    return {
      thread:     threadRows[0],
      replies,
      total:      count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async createThread(data: CreateThreadData) {
    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO forum_threads (category_id, author_id, title, content, views, is_pinned, is_locked, reply_count, last_reply_at, created_at)
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, NOW(), NOW())
    `, [data.categoryId, data.authorId, data.title, data.content]);

    // Mantener thread_count desnormalizado si la columna existe
    cmsDB.execute(
      'UPDATE forum_categories SET thread_count = thread_count + 1 WHERE id = ?',
      [data.categoryId]
    ).catch(() => { /* columna puede no existir en instancias antiguas */ });

    return { id: result.insertId, ...data };
  }

  async createReply(data: CreateReplyData) {
    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO forum_replies (thread_id, author_id, content)
      VALUES (?, ?, ?)
    `, [data.threadId, data.authorId, data.content]);

    await cmsDB.execute(`
      UPDATE forum_threads
      SET reply_count  = reply_count + 1,
          last_reply_at = NOW()
      WHERE id = ?
    `, [data.threadId]);

    return { id: result.insertId, ...data };
  }

  // ═══════════════════════════════════════════════════════════
  // NOTICIAS
  // ═══════════════════════════════════════════════════════════

  async getNews(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [[{ count }]] = await cmsDB.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM news WHERE is_published = 1'
    );

    const [rows] = await cmsDB.query<RowDataPacket[]>(
      'SELECT * FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return { news: rows, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  async getNewsBySlug(slug: string) {
    const [rows] = await cmsDB.query<RowDataPacket[]>(
      'SELECT * FROM news WHERE slug = ? AND is_published = 1',
      [slug]
    );
    if (!rows.length) return null;

    cmsDB.execute('UPDATE news SET views = views + 1 WHERE slug = ?', [slug])
      .catch(err => console.error('[community] Error incrementando views de news:', err));

    return rows[0];
  }

  async createNews(data: CreateNewsData) {
    const slug = slugify(data.title);

    // Verificar slug único
    const [existing] = await cmsDB.query<RowDataPacket[]>(
      'SELECT id FROM news WHERE slug = ?', [slug]
    );
    if (existing.length > 0) {
      throw new Error('SLUG_CONFLICT');
    }

    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO news (author_id, title, slug, summary, content, tags, cover_image, is_published, views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      data.authorId, data.title, slug, data.summary,
      data.content, data.tags, data.cover_image, data.is_published,
    ]);

    return { id: result.insertId, slug, ...data };
  }

  async updateNews(id: number, data: Partial<CreateNewsData>) {
    const fields: string[] = [];
    const values: any[]   = [];

    if (data.title)        { fields.push('title = ?');        values.push(data.title); }
    if (data.content)      { fields.push('content = ?');      values.push(data.content); }
    if (data.summary       !== undefined) { fields.push('summary = ?');      values.push(data.summary); }
    if (data.tags          !== undefined) { fields.push('tags = ?');         values.push(data.tags); }
    if (data.cover_image   !== undefined) { fields.push('cover_image = ?');  values.push(data.cover_image); }
    if (data.is_published  !== undefined) { fields.push('is_published = ?'); values.push(data.is_published); }

    if (fields.length === 0) throw new Error('No hay campos para actualizar');

    values.push(id);
    await cmsDB.execute(
      `UPDATE news SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    const [rows] = await cmsDB.query<RowDataPacket[]>('SELECT * FROM news WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async deleteNews(id: number) {
    await cmsDB.execute('DELETE FROM news WHERE id = ?', [id]);
  }

  // ═══════════════════════════════════════════════════════════
  // DEVBLOG
  // ═══════════════════════════════════════════════════════════

  async getDevBlogPosts(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [[{ count }]] = await cmsDB.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM devblog WHERE is_published = 1'
    );

    const [rows] = await cmsDB.query<RowDataPacket[]>(
      'SELECT * FROM devblog WHERE is_published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return { posts: rows, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  async getDevBlogBySlug(slug: string) {
    const [rows] = await cmsDB.query<RowDataPacket[]>(
      'SELECT * FROM devblog WHERE slug = ? AND is_published = 1',
      [slug]
    );
    if (!rows.length) return null;

    cmsDB.execute('UPDATE devblog SET views = views + 1 WHERE slug = ?', [slug])
      .catch(err => console.error('[community] Error incrementando views de devblog:', err));

    return rows[0];
  }

  async createDevBlogPost(data: CreateDevBlogData) {
    const slug = slugify(data.title);

    const [existing] = await cmsDB.query<RowDataPacket[]>(
      'SELECT id FROM devblog WHERE slug = ?', [slug]
    );
    if (existing.length > 0) {
      throw new Error('SLUG_CONFLICT');
    }

    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO devblog (author_id, title, slug, summary, content, tags, cover_image, is_published, views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      data.authorId, data.title, slug, data.summary,
      data.content, data.tags, data.cover_image, data.is_published,
    ]);

    return { id: result.insertId, slug, ...data };
  }

  async updateDevBlogPost(id: number, data: Partial<CreateDevBlogData>) {
    const fields: string[] = [];
    const values: any[]   = [];

    if (data.title)        { fields.push('title = ?');        values.push(data.title); }
    if (data.content)      { fields.push('content = ?');      values.push(data.content); }
    if (data.summary       !== undefined) { fields.push('summary = ?');      values.push(data.summary); }
    if (data.tags          !== undefined) { fields.push('tags = ?');         values.push(data.tags); }
    if (data.cover_image   !== undefined) { fields.push('cover_image = ?');  values.push(data.cover_image); }
    if (data.is_published  !== undefined) { fields.push('is_published = ?'); values.push(data.is_published); }

    if (fields.length === 0) throw new Error('No hay campos para actualizar');

    values.push(id);
    await cmsDB.execute(
      `UPDATE devblog SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    const [rows] = await cmsDB.query<RowDataPacket[]>('SELECT * FROM devblog WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async deleteDevBlogPost(id: number) {
    await cmsDB.execute('DELETE FROM devblog WHERE id = ?', [id]);
  }
}

export default new CommunityService();