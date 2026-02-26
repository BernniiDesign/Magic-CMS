// frontend/src/pages/NewForumThread.tsx
// NOTA: El problema al crear hilos es que el componente existente en Forum.tsx
// apunta a /forum/new pero esa ruta no existe. Esta página la implementa correctamente.
// Además, el backend debe mapear author_id desde el JWT (no desde el body) para
// evitar spoofing. Ver comentarios de seguridad abajo.

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaComments, FaArrowLeft, FaCheck, FaSpinner,
  FaLightbulb, FaLock
} from 'react-icons/fa';
import { GiSwordsPower } from 'react-icons/gi';
import { communityAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
}

const MAX_TITLE = 200;
const MAX_CONTENT = 10000; // límite razonable para texto plano del foro

export default function NewForumThread() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  // Precarga la categoría si viene de ?category=N
  const preselectedCategory = searchParams.get('category');

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(
    preselectedCategory ? parseInt(preselectedCategory, 10) : null
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Guard: redirige si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para crear un hilo');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    communityAPI.getForumCategories()
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => toast.error('Error al cargar categorías'))
      .finally(() => setLoadingCats(false));
  }, []);

  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleSubmit = async () => {
    // Validaciones del lado cliente — el backend debe replicarlas todas
    if (!categoryId) return toast.error('Selecciona una categoría');
    if (!title.trim()) return toast.error('El título es obligatorio');
    if (title.trim().length < 5) return toast.error('El título debe tener al menos 5 caracteres');
    if (!content.trim()) return toast.error('El contenido no puede estar vacío');
    if (content.trim().length < 10) return toast.error('El contenido es demasiado corto');

    try {
      setSubmitting(true);
      // SEGURIDAD: author_id NO se envía desde el cliente.
      // El backend lo extrae del JWT access token (req.user.id).
      // Si el backend no hace esto, es una vulnerabilidad crítica de spoofing.
      const { data } = await communityAPI.createThread({
        categoryId,           // ← camelCase
        title: title.trim(),
        content: content.trim(),
      });

      toast.success('Hilo creado correctamente');
      // La respuesta es { success: true, thread: { id, ... } }
      navigate(`/forum/thread/${data.thread.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al crear el hilo';
      // Manejo específico de errores del servidor
      if (err?.response?.status === 429) {
        toast.error('Demasiadas publicaciones. Espera unos minutos.');
      } else if (err?.response?.status === 403) {
        toast.error('No tienes permiso para publicar en esta categoría.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/forum')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-wow-gold mb-6 transition-colors"
        >
          <FaArrowLeft /> Volver a Foros
        </button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wow-gold/20 to-yellow-600/10 border border-wow-gold/30 flex items-center justify-center">
              <FaComments className="text-wow-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">
                Nuevo Hilo
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">Inicia una nueva discusión en los foros del servidor</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-wow-gold/40 via-wow-gold/20 to-transparent mt-5" />
        </motion.div>

        <div className="space-y-5">

          {/* Selección de categoría */}
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              <GiSwordsPower className="text-wow-gold" /> Categoría
              <span className="text-red-400 ml-0.5">*</span>
            </label>

            {loadingCats ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-dark-600 border-t-wow-gold" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      categoryId === cat.id
                        ? 'bg-wow-gold/10 border-wow-gold/50 text-white'
                        : 'bg-dark-900/40 border-dark-600 text-gray-400 hover:border-dark-500 hover:text-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-colors ${
                      categoryId === cat.id
                        ? 'bg-wow-gold/20 text-wow-gold'
                        : 'bg-dark-700 text-gray-500'
                    }`}>
                      <FaComments />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{cat.name}</div>
                      {cat.description && (
                        <div className="text-xs text-gray-500 truncate">{cat.description}</div>
                      )}
                    </div>
                    {categoryId === cat.id && (
                      <FaCheck className="text-wow-gold shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Título del hilo */}
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <span className="text-wow-gold">T</span> Título
              <span className="text-red-400 ml-0.5">*</span>
              <span className="ml-auto text-gray-600 font-normal normal-case">{title.length}/{MAX_TITLE}</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={MAX_TITLE}
              placeholder="Ej: ¿Alguien tiene guía para Icecrown 25 heroico?"
              className="w-full bg-dark-900/60 border border-dark-600 focus:border-wow-gold/50 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
            />
            {title.length > 0 && title.trim().length < 5 && (
              <p className="text-xs text-red-400/70 mt-1.5 flex items-center gap-1">
                <FaLightbulb className="text-[9px]" /> El título debe tener al menos 5 caracteres
              </p>
            )}
          </div>

          {/* Contenido */}
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-700 flex items-center gap-2">
              <FaComments className="text-wow-gold text-xs" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Contenido
              </span>
              <span className="text-red-400 ml-0.5 text-xs">*</span>
              <span className="ml-auto text-[10px] text-gray-600">{content.length}/{MAX_CONTENT}</span>
            </div>

            {/* Hint para item tooltips */}
            <div className="px-5 py-2 bg-dark-900/30 border-b border-dark-700/50 text-[11px] text-gray-600 flex items-center gap-1.5">
              <FaLightbulb className="text-wow-gold opacity-60" />
              Usa <code className="bg-dark-900 px-1.5 py-0.5 rounded text-gray-400">[item=12345]Nombre[/item]</code> para mostrar tooltips de ítems
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={MAX_CONTENT}
              rows={12}
              placeholder="Escribe el contenido de tu hilo aquí...

Recuerda ser respetuoso y seguir las normas del servidor."
              className="w-full bg-dark-900/40 border-0 px-5 py-4 text-sm text-gray-300 placeholder-gray-600 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Normas recordatorio */}
          <div className="flex items-start gap-3 p-4 bg-dark-800/30 border border-dark-700/50 rounded-xl text-xs text-gray-500">
            <FaLock className="text-gray-600 mt-0.5 shrink-0" />
            <span>
              Al publicar confirmas que el contenido respeta las{' '}
              <span className="text-wow-gold cursor-pointer hover:underline">normas del foro</span>.
              Los posts que infrinjan las reglas serán eliminados sin previo aviso.
            </span>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3 justify-end pt-1">
            <button
              onClick={() => navigate('/forum')}
              className="px-5 py-2.5 bg-dark-800 border border-dark-600 text-gray-400 hover:text-white rounded-lg text-sm transition-all hover:border-dark-500"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !categoryId ||
                title.trim().length < 5 ||
                content.trim().length < 10
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-wow-gold to-yellow-600 text-dark-900 font-bold rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <FaCheck />
                  Publicar hilo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}