// backend/src/services/community.service.ts
// DB: cms → foros, noticias, devblog
// author_name NO se inserta (columna no existe) — solo author_id

import { cmsDB } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

class CommunityService {

  // ==========================================================
  // FOROS
  // ==========================================================

  async getForumCategories() {
    const [rows] = await cmsDB.query<RowDataPacket[]>(`
      SELECT fc.*, COUNT(ft.id) AS thread_count
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
      SELECT * FROM forum_threads
      WHERE category_id = ?
      ORDER BY is_pinned DESC, last_reply_at DESC
      LIMIT ? OFFSET ?
    `, [categoryId, limit, offset]);
    return { threads, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  async getThreadWithReplies(threadId: number, page: number) {
    const limit = 15;
    const offset = (page - 1) * limit;

    await cmsDB.execute(
      'UPDATE forum_threads SET views = views + 1 WHERE id = ?',
      [threadId]
    );

    const [threadRows] = await cmsDB.query<RowDataPacket[]>(
      'SELECT * FROM forum_threads WHERE id = ?', [threadId]
    );
    if (!threadRows.length) return null;

    const [replies] = await cmsDB.query<RowDataPacket[]>(`
      SELECT * FROM forum_replies
      WHERE thread_id = ? AND is_deleted = 0
      ORDER BY created_at ASC LIMIT ? OFFSET ?
    `, [threadId, limit, offset]);

    const [[{ count }]] = await cmsDB.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM forum_replies WHERE thread_id = ? AND is_deleted = 0',
      [threadId]
    );

    return { thread: threadRows[0], replies, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  async createThread(data: {
    categoryId: number; title: string; content: string;
    authorId: number; authorName: string;  // ← authorName en el tipo pero NO se inserta
  }) {
    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO forum_threads (category_id, author_id, title, content)
      VALUES (?, ?, ?, ?)
    `, [data.categoryId, data.authorId, data.title, data.content]);
    return { id: result.insertId, ...data };
  }

  async createReply(data: {
    threadId: number; content: string;
    authorId: number; authorName: string;  // ← authorName en el tipo pero NO se inserta
  }) {
    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO forum_replies (thread_id, author_id, content)
      VALUES (?, ?, ?)
    `, [data.threadId, data.authorId, data.content]);

    await cmsDB.execute(`
      UPDATE forum_threads
      SET reply_count = reply_count + 1, last_reply_at = NOW()
      WHERE id = ?
    `, [data.threadId]);

    return { id: result.insertId, ...data };
  }

  // ==========================================================
  // NOTICIAS
  // ==========================================================

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
      'SELECT * FROM news WHERE slug = ? AND is_published = 1', [slug]
    );
    if (!rows.length) return null;
    await cmsDB.execute('UPDATE news SET views = views + 1 WHERE slug = ?', [slug]);
    return rows[0];
  }

  async createNews(data: {
    title: string; content: string; summary: string;
    tags: string; authorId: number; authorName: string;  // ← authorName NO se inserta
  }) {
    const slug = slugify(data.title);
    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO news (author_id, title, slug, summary, content, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.authorId, data.title, slug, data.summary || '', data.content, data.tags || '']);
    return { id: result.insertId, slug, ...data };
  }

  // ==========================================================
  // DEVBLOG
  // ==========================================================

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
      'SELECT * FROM devblog WHERE slug = ? AND is_published = 1', [slug]
    );
    if (!rows.length) return null;
    await cmsDB.execute('UPDATE devblog SET views = views + 1 WHERE slug = ?', [slug]);
    return rows[0];
  }

  async createDevBlogPost(data: {
    title: string; content: string; summary: string;
    tags: string; authorId: number; authorName: string;  // ← authorName NO se inserta
  }) {
    const slug = slugify(data.title);
    const [result] = await cmsDB.execute<ResultSetHeader>(`
      INSERT INTO devblog (author_id, title, slug, summary, content, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.authorId, data.title, slug, data.summary || '', data.content, data.tags || '']);
    return { id: result.insertId, slug, ...data };
  }
}

export default new CommunityService();