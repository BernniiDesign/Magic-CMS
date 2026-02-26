// ============================================================
// DIAGNÓSTICO Y SOLUCIÓN: Por qué no se pueden crear hilos
// ============================================================
//
// El problema más común es uno (o varios) de estos:
//
// 1. La ruta POST /community/forums/thread no existe en el backend.
// 2. El backend intenta leer author_id del body (y el cliente no lo envía).
// 3. Falta validación del JWT en el middleware de la ruta.
// 4. forum_threads.author_id no encuentra la FK en auth.account
//    porque la query usa un ID de `cms.users` incompatible.
//
// ============================================================
// BACKEND: routes/community.js (extracto relevante)
// ============================================================

const express = require('express');
const router  = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');

// ── Middleware de autenticación (debe existir previamente) ───
// Asume que req.user = { id, username, gmlevel } tras verificar JWT
const { requireAuth, requireGM } = require('../middleware/auth');

// ── Rate limit específico para creación de contenido ────────
// Protege contra spam masivo sin bloquear usuarios legítimos.
// Usa sliding window en Redis si está disponible; cae a memoria.
const postRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5,                    // máx 5 posts por IP en esa ventana
  message: { message: 'Demasiadas publicaciones. Espera unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Clave por IP + usuario para más granularidad
  keyGenerator: (req) => `${req.ip}:${req.user?.id ?? 'anon'}`,
});

// ── Sanitización de HTML para contenido rico (news/devblog) ──
// NUNCA se renderiza HTML crudo sin pasar por esto primero.
const ALLOWED_TAGS = [
  'p','br','strong','em','u','s','code','pre',
  'ul','ol','li','blockquote','h2','h3','h4',
  'a','img','table','thead','tbody','tr','td','th'
];
const ALLOWED_ATTRS = {
  'a': ['href', 'target', 'rel'],
  'img': ['src', 'alt'],
  '*': ['class']
};

function sanitizeContent(html) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    // Fuerza rel=noopener en todos los enlaces externos
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'noopener noreferrer' }
      })
    }
  });
}

// ============================================================
// POST /community/forums/thread — Crear hilo
// ============================================================
// CRÍTICO: author_id SIEMPRE del JWT, nunca del body.
// Si lo lees del body, cualquier usuario puede suplantar a otro.
// ============================================================

router.post(
  '/forums/thread',
  requireAuth,                    // 401 si no hay JWT válido
  postRateLimit,                  // 429 si supera el límite
  [
    body('category_id')
      .isInt({ min: 1 })
      .withMessage('category_id debe ser un entero positivo'),
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('El título debe tener entre 5 y 200 caracteres')
      .escape(),                  // escapa HTML en el título (es texto plano)
    body('content')
      .trim()
      .isLength({ min: 10, max: 10000 })
      .withMessage('El contenido debe tener entre 10 y 10.000 caracteres'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { category_id, title, content } = req.body;
    // SEGURIDAD: author_id exclusivamente del token verificado
    const authorId = req.user.id;

    const db = req.app.get('cmsDb'); // conexión a la DB `cms`

    try {
      // 1. Verificar que la categoría existe y está activa
      const [cats] = await db.execute(
        'SELECT id FROM forum_categories WHERE id = ? AND is_active = 1',
        [category_id]
      );
      if (cats.length === 0) {
        return res.status(404).json({ message: 'Categoría no encontrada o inactiva' });
      }

      // 2. Contenido del foro es texto plano (no HTML).
      //    Los [item=XXX] tags son BBCode interno, no HTML.
      //    No sanitizamos HTML aquí porque no se renderiza como tal.
      //    RichContent.tsx parsea el texto crudo.

      // 3. Insertar el hilo
      const [result] = await db.execute(
        `INSERT INTO forum_threads
           (category_id, author_id, title, content, views, is_pinned, is_locked, reply_count, last_reply_at, created_at)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, NOW(), NOW())`,
        [category_id, authorId, title, content]
      );

      // 4. Incrementar thread_count de la categoría
      //    (desnormalización para evitar COUNT(*) en cada listado)
      await db.execute(
        'UPDATE forum_categories SET thread_count = thread_count + 1 WHERE id = ?',
        [category_id]
      );

      return res.status(201).json({
        message: 'Hilo creado correctamente',
        threadId: result.insertId
      });

    } catch (err) {
      console.error('[forum/thread POST]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// ============================================================
// POST /community/news — Crear noticia
// Solo GMs o admins (gmlevel >= 1 según tu lógica)
// ============================================================

router.post(
  '/news',
  requireAuth,
  requireGM,      // solo staff puede publicar noticias
  [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Título inválido'),
    body('slug')
      .trim()
      .matches(/^[a-z0-9-]+$/)
      .isLength({ min: 3, max: 220 })
      .withMessage('Slug inválido: solo letras minúsculas, números y guiones'),
    body('content').trim().notEmpty().withMessage('El contenido es obligatorio'),
    body('summary').optional().trim().isLength({ max: 500 }),
    body('tags').optional().trim().isLength({ max: 255 }),
    body('cover_image').optional().trim().isURL().withMessage('URL de imagen inválida'),
    body('is_published').optional().isIn([0, 1]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { title, slug, summary, content, tags, cover_image, is_published } = req.body;
    const authorId = req.user.id;
    const db = req.app.get('cmsDb');

    try {
      // Verificar unicidad del slug
      const [existing] = await db.execute(
        'SELECT id FROM news WHERE slug = ?', [slug]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: 'Ya existe una noticia con ese slug' });
      }

      const safeContent = sanitizeContent(content);

      const [result] = await db.execute(
        `INSERT INTO news (author_id, title, slug, summary, content, tags, cover_image, is_published, views)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          authorId, title, slug,
          summary || null,
          safeContent,
          tags || null,
          cover_image || null,
          is_published ?? 1
        ]
      );

      return res.status(201).json({ message: 'Noticia creada', newsId: result.insertId });

    } catch (err) {
      console.error('[news POST]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// ============================================================
// POST /community/devblog — Crear post de dev blog
// Solo admins (gmlevel >= 3 o rol específico)
// ============================================================

router.post(
  '/devblog',
  requireAuth,
  requireGM,      // ajusta a requireAdmin si quieres nivel más alto
  [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Título inválido'),
    body('slug')
      .trim()
      .matches(/^[a-z0-9-]+$/)
      .isLength({ min: 3, max: 220 })
      .withMessage('Slug inválido'),
    body('content').trim().notEmpty().withMessage('El contenido es obligatorio'),
    body('summary').optional().trim().isLength({ max: 500 }),
    body('tags').optional().trim().isLength({ max: 255 }),
    body('cover_image').optional().trim().isURL(),
    body('is_published').optional().isIn([0, 1]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { title, slug, summary, content, tags, cover_image, is_published } = req.body;
    const authorId = req.user.id;
    const db = req.app.get('cmsDb');

    try {
      const [existing] = await db.execute(
        'SELECT id FROM devblog WHERE slug = ?', [slug]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: 'Ya existe un post con ese slug' });
      }

      const safeContent = sanitizeContent(content);

      const [result] = await db.execute(
        `INSERT INTO devblog (author_id, title, slug, summary, content, tags, cover_image, is_published, views)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          authorId, title, slug,
          summary || null,
          safeContent,
          tags || null,
          cover_image || null,
          is_published ?? 1
        ]
      );

      return res.status(201).json({ message: 'Post publicado', postId: result.insertId });

    } catch (err) {
      console.error('[devblog POST]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

module.exports = router;

// ============================================================
// CORRECCIÓN DE RUTAS EN App.tsx / router
// ============================================================
//
// Asegúrate de tener estas rutas registradas en tu router:
//
// import NewForumThread from './pages/NewForumThread';
// import CreateNews from './pages/CreateNews';
// import CreateDevBlog from './pages/CreateDevBlog';
//
// <Route path="/forum/new" element={<NewForumThread />} />
// <Route path="/news/new" element={<CreateNews />} />       // requiere rol GM en UI
// <Route path="/devblog/new" element={<CreateDevBlog />} /> // requiere rol GM en UI
//
// ============================================================
// SCHEMA: campo faltante en forum_categories
// ============================================================
//
// El schema del CMS NO tiene thread_count en forum_categories,
// pero Forum.tsx lo intenta leer (cat.thread_count).
// Solución: Agregar la columna o calcularla en el JOIN.
//
// OPCIÓN A — Columna desnormalizada (recomendada para rendimiento):
//
//   ALTER TABLE forum_categories
//     ADD COLUMN thread_count INT UNSIGNED NOT NULL DEFAULT 0;
//
//   -- Inicializar con conteo real:
//   UPDATE forum_categories fc
//   SET fc.thread_count = (
//     SELECT COUNT(*) FROM forum_threads ft WHERE ft.category_id = fc.id
//   );
//
// OPCIÓN B — COUNT en la query GET /community/forums (sin schema change):
//
//   SELECT
//     fc.*,
//     COUNT(ft.id) AS thread_count
//   FROM forum_categories fc
//   LEFT JOIN forum_threads ft ON ft.category_id = fc.id
//   GROUP BY fc.id
//   ORDER BY fc.order ASC;
//
// La Opción B no modifica el schema base (preferible según tus restricciones).
// La Opción A es más eficiente en tablas con miles de hilos.
// ============================================================