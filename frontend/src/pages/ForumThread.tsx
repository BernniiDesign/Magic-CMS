// frontend/src/pages/ForumThread.tsx

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaReply, FaThumbtack, FaLock, FaArrowLeft,
  FaUser, FaClock, FaEye
} from 'react-icons/fa';
import { ItemTooltip } from '../components/ItemTooltip';
import CommunitySidebar from '../components/CommunitySidebar';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Regex para detectar tags BBCode de WotLKDB
const ITEM_TAG_REGEX = /\[item=(\d+)\]([^\[]*)\[\/item\]/g;
const ENCHANT_TAG_REGEX = /\[enchant=(\d+)\]([^\[]*)\[\/enchant\]/g;
const SPELL_TAG_REGEX = /\[spell=(\d+)\]([^\[]*)\[\/spell\]/g;

/** 
 * Renderiza texto con [item=X], [enchant=X], [spell=X] convertidos a tooltips.
 * Ejemplo de uso en posts:
 *   [item=40395]Torch of Holy Fire[/item]
 *   [enchant=3539]Berserking[/enchant]
 *   [spell=48441]Rejuvenation[/spell]
 */
function RichContent({ content }: { content: string }) {
  const allMatches: Array<{ index: number; length: number; element: React.ReactNode }> = [];

  // Buscar todos los [item=X]
  let match: RegExpExecArray | null;
  const itemRegex = new RegExp(ITEM_TAG_REGEX.source, 'g');
  while ((match = itemRegex.exec(content)) !== null) {
    const itemId = parseInt(match[1], 10);
    const itemName = match[2] || `Item ${itemId}`;
    allMatches.push({
      index: match.index,
      length: match[0].length,
      element: (
        <ItemTooltip
          key={`item-${match.index}`}
          itemId={itemId}
          type="item"
          className="text-blue-400 hover:text-wow-ice cursor-pointer underline decoration-dotted"
        >
          {itemName}
        </ItemTooltip>
      )
    });
  }

  // Buscar todos los [enchant=X]
  const enchantRegex = new RegExp(ENCHANT_TAG_REGEX.source, 'g');
  while ((match = enchantRegex.exec(content)) !== null) {
    const enchantId = parseInt(match[1], 10);
    const enchantName = match[2] || `Enchant ${enchantId}`;
    allMatches.push({
      index: match.index,
      length: match[0].length,
      element: (
        <ItemTooltip
          key={`enchant-${match.index}`}
          itemId={enchantId}
          type="enchantment"
          className="text-purple-400 hover:text-purple-300 cursor-pointer underline decoration-dotted"
        >
          {enchantName}
        </ItemTooltip>
      )
    });
  }

  // Buscar todos los [spell=X]
  const spellRegex = new RegExp(SPELL_TAG_REGEX.source, 'g');
  while ((match = spellRegex.exec(content)) !== null) {
    const spellId = parseInt(match[1], 10);
    const spellName = match[2] || `Spell ${spellId}`;
    allMatches.push({
      index: match.index,
      length: match[0].length,
      element: (
        <ItemTooltip
          key={`spell-${match.index}`}
          itemId={spellId}
          type="spell"
          className="text-green-400 hover:text-green-300 cursor-pointer underline decoration-dotted"
        >
          {spellName}
        </ItemTooltip>
      )
    });
  }

  // Ordenar matches por posición en el texto
  allMatches.sort((a, b) => a.index - b.index);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  for (const match of allMatches) {
    // Texto antes del tag
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>
      );
    }
    parts.push(match.element);
    lastIndex = match.index + match.length;
  }

  // Texto final
  if (lastIndex < content.length) {
    parts.push(<span key="end">{content.slice(lastIndex)}</span>);
  }

  return (
    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
      {parts.length > 0 ? parts : content}
    </div>
  );
}

export default function ForumThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchThread();
  }, [threadId, page]);

  const fetchThread = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get(`/community/forums/thread/${threadId}?page=${page}`);
      setData(res.thread);
    } catch {
      toast.error('Error al cargar el hilo');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      setSending(true);
      await api.post(`/community/forums/thread/${threadId}/reply`, { content: reply });
      setReply('');
      toast.success('Respuesta publicada');
      fetchThread();
    } catch {
      toast.error('Error al publicar respuesta');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/forum')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-wow-gold mb-6 transition-colors"
        >
          <FaArrowLeft /> Volver a Foros
        </button>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-dark-600 border-t-wow-gold" />
          </div>
        ) : data ? (
          <div className="flex gap-6 items-start">
            <div className="flex-1 space-y-4">

              {/* Hilo principal */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden"
              >
                {/* Header del hilo */}
                <div className="px-6 py-4 border-b border-dark-700/60 bg-dark-900/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {data.thread.is_pinned === 1 && (
                          <span className="text-xs text-yellow-400 flex items-center gap-1">
                            <FaThumbtack /> Fijado
                          </span>
                        )}
                        {data.thread.is_locked === 1 && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <FaLock /> Cerrado
                          </span>
                        )}
                      </div>
                      <h1 className="text-xl font-bold text-white">{data.thread.title}</h1>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                      <span className="flex items-center gap-1"><FaEye /> {data.thread.views}</span>
                      <span className="flex items-center gap-1"><FaReply /> {data.thread.reply_count}</span>
                    </div>
                  </div>
                </div>

                {/* Contenido del hilo */}
                <div className="flex gap-0">
                  <UserPanel author={data.thread.author_id} />
                  <div className="flex-1 p-5 border-l border-dark-700/40">
                    <RichContent content={data.thread.content} />
                    <div className="mt-4 text-xs text-gray-600 flex items-center gap-1">
                      <FaClock className="text-[9px]" />
                      {new Date(data.thread.created_at).toLocaleString('es-ES')}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Respuestas */}
              {data.replies?.map((r: any, idx: number) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-dark-800/40 rounded-xl border border-dark-700/60 overflow-hidden"
                >
                  <div className="flex">
                    <UserPanel author={r.author_id} small />
                    <div className="flex-1 p-5 border-l border-dark-700/40">
                      <RichContent content={r.content} />
                      <div className="mt-4 text-xs text-gray-600 flex items-center gap-1">
                        <FaClock className="text-[9px]" />
                        {new Date(r.created_at).toLocaleString('es-ES')}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Paginación */}
              {data.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
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

              {/* Caja de respuesta */}
              {isAuthenticated && data.thread.is_locked !== 1 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-dark-800/50 rounded-xl border border-dark-700 p-5"
                >
                  <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <FaReply className="text-wow-gold" /> Tu Respuesta
                  </h3>

                  <div className="mb-2 text-xs text-gray-600 space-y-1">
                    <div>
                      Tip: usa BBCode para tooltips de WotLKDB:
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <code className="bg-dark-900 px-1.5 py-0.5 rounded text-blue-400">
                        [item=40395]Torch of Holy Fire[/item]
                      </code>
                      <code className="bg-dark-900 px-1.5 py-0.5 rounded text-purple-400">
                        [enchant=3539]Berserking[/enchant]
                      </code>
                      <code className="bg-dark-900 px-1.5 py-0.5 rounded text-green-400">
                        [spell=48441]Rejuvenation[/spell]
                      </code>
                    </div>
                  </div>

                  <textarea
                    ref={replyRef}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    rows={5}
                    placeholder="Escribe tu respuesta..."
                    className="w-full bg-dark-900/60 border border-dark-600 focus:border-wow-gold/50 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none transition-colors"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleReply}
                      disabled={!reply.trim() || sending}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-wow-gold to-yellow-600 text-dark-900 font-bold rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-40"
                    >
                      {sending ? 'Publicando...' : 'Publicar Respuesta'}
                    </button>
                  </div>
                </motion.div>
              ) : !isAuthenticated ? (
                <div className="bg-dark-800/40 rounded-xl border border-dark-700 p-5 text-center text-sm text-gray-500">
                  <Link to="/login" className="text-wow-gold hover:underline">Inicia sesión</Link> para responder
                </div>
              ) : (
                <div className="bg-dark-800/40 rounded-xl border border-red-900/30 p-4 text-center text-sm text-red-400/70 flex items-center justify-center gap-2">
                  <FaLock /> Este hilo está cerrado
                </div>
              )}
            </div>

            <CommunitySidebar />
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">Hilo no encontrado</div>
        )}
      </div>
    </div>
  );
}

function UserPanel({ author, small }: { author: number; small?: boolean }) {
  return (
    <div className={`${small ? 'w-24' : 'w-28'} shrink-0 bg-dark-900/40 p-4 flex flex-col items-center gap-2 text-center`}>
      <div className={`${small ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-br from-wow-gold to-yellow-600 rounded-full flex items-center justify-center`}>
        <FaUser className={`${small ? 'text-sm' : 'text-base'} text-dark-900`} />
      </div>
      <span className="text-xs font-semibold text-gray-300 break-all">Usuario #{author}</span>
    </div>
  );
}