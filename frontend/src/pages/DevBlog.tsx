// frontend/src/pages/DevBlog.tsx

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaClock, FaUser, FaEye, FaCode } from 'react-icons/fa';
import { GiGearHammer } from 'react-icons/gi';
import CommunitySidebar from '../components/CommunitySidebar';



import api from '../services/api';

interface DevPost {
  id: number; title: string; slug: string; summary: string;
  content: string; tags: string; author_name: string;
  views: number; created_at: string; cover_image?: string;
}

// ── Lista de posts ───────────────────────────────────────────
export function DevBlogList() {
  const [posts, setPosts]   = useState<DevPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/community/devblog?page=${page}&limit=8`)
      .then(({ data }) => {
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">

        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <GiGearHammer className="text-wow-gold text-3xl" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">
              Blog de Desarrolladores
            </h1>
          </div>
          <p className="text-gray-400 text-sm ml-10">
            Actualizaciones técnicas, detrás de escena y roadmap
          </p>
          <div className="h-px bg-gradient-to-r from-wow-gold/40 via-wow-gold/20 to-transparent mt-4" />
        </motion.div>

        <div className="flex gap-6 items-start">
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-dark-600 border-t-wow-gold" />
              </div>
            ) : (
              <>
                <div className="grid gap-5">
                  {posts.map((post, idx) => (
                    <DevBlogCard key={post.id} post={post} index={idx} />
                  ))}
                  {posts.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                      <FaCode className="text-4xl mx-auto mb-3 opacity-30" />
                      <p>Aún no hay posts publicados</p>
                    </div>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                          p === page
                            ? 'bg-wow-gold text-dark-900'
                            : 'bg-dark-800 text-gray-400 hover:bg-dark-700 border border-dark-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <CommunitySidebar />
        </div>
      </div>
    </div>
  );
}

// ── Post individual ──────────────────────────────────────────
export function DevBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<DevPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api.get(`/community/devblog/${slug}`)
      .then(({ data }) => setPost(data.post))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex gap-6 items-start">
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-dark-600 border-t-wow-gold" />
              </div>
            ) : post ? (
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden"
              >
                {post.cover_image && (
                  <img src={post.cover_image} alt={post.title} className="w-full h-64 object-cover" />
                )}
                <div className="p-8">
                  {/* Dev badge */}
                  <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full mb-4">
                    <GiGearHammer /> Actualización de Dev
                  </div>

                  {/* Tags */}
                  {post.tags && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.split(',').map(t => (
                        <span key={t} className="text-xs px-2 py-1 bg-wow-gold/10 border border-wow-gold/30 text-wow-gold rounded-full">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                    <span className="flex items-center gap-1">
                      <FaUser className="text-[9px]" /> {post.author_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaClock className="text-[9px]" />
                      {new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaEye className="text-[9px]" /> {post.views}
                    </span>
                  </div>

                  <div
                    className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
              </motion.article>
            ) : (
              <div className="text-center py-20 text-gray-500">Post no encontrado</div>
            )}
          </div>
          <CommunitySidebar />
        </div>
      </div>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────

function DevBlogCard({ post, index }: { post: DevPost; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link to={`/devblog/${post.slug}`}>
        <div className="group bg-dark-800/50 hover:bg-dark-700/50 rounded-xl border border-dark-700 hover:border-cyan-500/40 transition-all overflow-hidden flex">
          {post.cover_image && (
            <img src={post.cover_image} alt={post.title} className="w-40 object-cover shrink-0" />
          )}
          <div className="p-5 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full flex items-center gap-1">
                <GiGearHammer className="text-[9px]" /> Dev Update
              </span>
              {post.tags && post.tags.split(',').slice(0, 2).map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 bg-wow-gold/10 border border-wow-gold/20 text-wow-gold rounded-full">
                  {t.trim()}
                </span>
              ))}
            </div>

            <h2 className="font-bold text-white group-hover:text-cyan-400 transition-colors mb-1.5">
              {post.title}
            </h2>
            <p className="text-sm text-gray-400 line-clamp-2">{post.summary}</p>

            <div className="flex items-center gap-4 text-[11px] text-gray-500 mt-3">
              <span className="flex items-center gap-1"><FaUser className="text-[9px]" /> {post.author_name}</span>
              <span className="flex items-center gap-1">
                <FaClock className="text-[9px]" />
                {new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1"><FaEye className="text-[9px]" /> {post.views}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}