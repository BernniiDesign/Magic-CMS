// frontend/src/pages/News.tsx

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaClock, FaUser, FaEye, FaTag } from 'react-icons/fa';
import CommunitySidebar from '../components/CommunitySidebar';
import api from '../services/api';

interface NewsItem {
  id: number; title: string; slug: string; summary: string;
  content: string; tags: string; author_name: string;
  views: number; created_at: string; cover_image?: string;
}

// ── Lista de noticias ────────────────────────────────────────
export function NewsList() {
  const [news, setNews]     = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/community/news?page=${page}&limit=8`)
      .then(({ data }) => {
        setNews(data.news || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">

        <PageHeader
          title="Noticias"
          subtitle="Mantente al día con las últimas novedades del servidor"
        />

        <div className="flex gap-6 items-start">
          <div className="flex-1">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                <div className="grid gap-5">
                  {news.map((item, idx) => (
                    <NewsCard key={item.id} item={item} index={idx} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination page={page} total={totalPages} onChange={setPage} />
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
export function NewsPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api.get(`/community/news/${slug}`)
      .then(({ data }) => setPost(data.news))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex gap-6 items-start">
          <div className="flex-1">
            {loading ? (
              <LoadingSpinner />
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

                  <PostMeta author={post.author_name} date={post.created_at} views={post.views} />

                  <div
                    className="mt-6 prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
              </motion.article>
            ) : (
              <div className="text-center py-20 text-gray-500">Noticia no encontrada</div>
            )}
          </div>
          <CommunitySidebar />
        </div>
      </div>
    </div>
  );
}

// ── Shared components ────────────────────────────────────────

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link to={`/news/${item.slug}`}>
        <div className="group bg-dark-800/50 hover:bg-dark-700/50 rounded-xl border border-dark-700 hover:border-wow-gold/40 transition-all overflow-hidden flex gap-0">
          {item.cover_image && (
            <img
              src={item.cover_image}
              alt={item.title}
              className="w-40 object-cover shrink-0"
            />
          )}
          <div className="p-5 flex-1">
            {item.tags && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.tags.split(',').slice(0, 3).map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-wow-gold/10 border border-wow-gold/20 text-wow-gold rounded-full">
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}

            <h2 className="font-bold text-white group-hover:text-wow-gold transition-colors mb-1.5">
              {item.title}
            </h2>
            <p className="text-sm text-gray-400 line-clamp-2">{item.summary}</p>
            <PostMeta author={item.author_name} date={item.created_at} views={item.views} className="mt-3" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function PostMeta({ author, date, views, className = '' }: {
  author: string; date: string; views: number; className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 text-[11px] text-gray-500 ${className}`}>
      <span className="flex items-center gap-1">
        <FaUser className="text-[9px]" /> {author}
      </span>
      <span className="flex items-center gap-1">
        <FaClock className="text-[9px]" />
        {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <span className="flex items-center gap-1">
        <FaEye className="text-[9px]" /> {views}
      </span>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-gray-400 mt-1 text-sm">{subtitle}</p>
      <div className="h-px bg-gradient-to-r from-wow-gold/40 via-wow-gold/20 to-transparent mt-4" />
    </motion.div>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex justify-center gap-2 mt-8">
      {Array.from({ length: total }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
            p === page
              ? 'bg-wow-gold text-dark-900'
              : 'bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white border border-dark-600'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-dark-600 border-t-wow-gold" />
    </div>
  );
}