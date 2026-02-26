// frontend/src/pages/CreateNews.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaNewspaper, FaSave, FaEye, FaEyeSlash, FaImage,
  FaTags, FaAlignLeft, FaHeading, FaTimes, FaCheck,
  FaSpinner, FaBold, FaItalic, FaLink, FaListUl, FaCode
} from 'react-icons/fa';
import { communityAPI } from '../services/api';
import toast from 'react-hot-toast';

interface FormState {
  title: string;
  slug: string;
  summary: string;
  content: string;
  tags: string;
  cover_image: string;
  is_published: boolean;
}

const INITIAL_FORM: FormState = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  tags: '',
  cover_image: '',
  is_published: true,
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 220);
}

// ── Toolbar de formato rápido ────────────────────────────────
function EditorToolbar({ textareaRef, value, onChange }: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
}) {
  const wrap = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e) || 'texto';
    const newVal = value.slice(0, s) + before + selected + after + value.slice(e);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  };

  const insertBlock = (block: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s } = el;
    const newVal = value.slice(0, s) + block + value.slice(s);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + block.length, s + block.length);
    });
  };

  const tools = [
    { icon: <FaBold />, label: 'Negrita', action: () => wrap('<strong>', '</strong>') },
    { icon: <FaItalic />, label: 'Cursiva', action: () => wrap('<em>', '</em>') },
    { icon: <FaCode />, label: 'Código', action: () => wrap('<code>', '</code>') },
    { icon: <FaLink />, label: 'Enlace', action: () => wrap('<a href="">', '</a>') },
    { icon: <FaListUl />, label: 'Lista', action: () => insertBlock('\n<ul>\n  <li></li>\n</ul>\n') },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-dark-900/60 border-b border-dark-600 rounded-t-lg">
      {tools.map(t => (
        <button
          key={t.label}
          type="button"
          onClick={t.action}
          title={t.label}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-wow-gold hover:bg-dark-700 rounded transition-all text-xs"
        >
          {t.icon}
        </button>
      ))}
      <div className="ml-auto text-[10px] text-gray-600">HTML permitido</div>
    </div>
  );
}

// ── Vista previa del contenido ───────────────────────────────
function PreviewPanel({ form }: { form: FormState }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden"
    >
      {form.cover_image && (
        <img src={form.cover_image} alt="preview" className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        {form.tags && (
          <div className="flex flex-wrap gap-2 mb-3">
            {form.tags.split(',').filter(Boolean).map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-wow-gold/10 border border-wow-gold/30 text-wow-gold rounded-full">
                {t.trim()}
              </span>
            ))}
          </div>
        )}
        <h2 className="text-xl font-bold text-white mb-2">
          {form.title || <span className="text-gray-600">Sin título</span>}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {form.summary || <span className="text-gray-600 italic">Sin resumen</span>}
        </p>
        <div
          className="prose prose-invert prose-sm max-w-none text-gray-300"
          dangerouslySetInnerHTML={{ __html: form.content || '<p class="text-gray-600 italic">Sin contenido</p>' }}
        />
      </div>
    </motion.div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function CreateNews() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [slugManual, setSlugManual] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const tags = form.tags ? form.tags.split(',').filter(Boolean).map(t => t.trim()) : [];

  const set = (key: keyof FormState, val: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleTitle = (v: string) => {
    set('title', v);
    if (!slugManual) set('slug', slugify(v));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t) || tags.length >= 5) return;
    set('tags', [...tags, t].join(','));
    setTagInput('');
  };

  const removeTag = (t: string) => {
    set('tags', tags.filter(x => x !== t).join(','));
  };

  const handleSubmit = async (publish: boolean) => {
    if (!form.title.trim()) return toast.error('El título es obligatorio');
    if (!form.content.trim()) return toast.error('El contenido no puede estar vacío');
    if (!form.slug.trim()) return toast.error('El slug es obligatorio');

    try {
      setSubmitting(true);
      await communityAPI.createNews({ ...form, is_published: publish ? 1 : 0 });
      toast.success(publish ? 'Noticia publicada' : 'Guardada como borrador');
      navigate('/news');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al guardar';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wow-gold/20 to-yellow-600/10 border border-wow-gold/30 flex items-center justify-center">
                <FaNewspaper className="text-wow-gold" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">
                  Crear Noticia
                </h1>
                <p className="text-gray-500 text-xs mt-0.5">Redacta y publica una nueva noticia para el servidor</p>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(p => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                showPreview
                  ? 'bg-wow-gold/10 border-wow-gold/40 text-wow-gold'
                  : 'bg-dark-800 border-dark-600 text-gray-400 hover:border-dark-500'
              }`}
            >
              {showPreview ? <FaEyeSlash /> : <FaEye />}
              {showPreview ? 'Ocultar preview' : 'Vista previa'}
            </button>
          </div>
          <div className="h-px bg-gradient-to-r from-wow-gold/40 via-wow-gold/20 to-transparent mt-5" />
        </motion.div>

        <div className={`grid gap-6 ${showPreview ? 'grid-cols-2' : 'grid-cols-1 max-w-3xl'}`}>

          {/* Formulario */}
          <div className="space-y-5">

            {/* Título */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                <FaHeading className="text-wow-gold" /> Título
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => handleTitle(e.target.value)}
                placeholder="Ej: Actualización de balanceo — Parche 3.3.5a r21"
                maxLength={200}
                className="w-full bg-dark-900/60 border border-dark-600 focus:border-wow-gold/50 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors text-lg font-semibold"
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-gray-600">slug:</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => { setSlugManual(true); set('slug', e.target.value); }}
                  className="flex-1 bg-transparent text-[11px] text-gray-500 outline-none border-b border-dashed border-dark-600 focus:border-wow-gold/40 pb-0.5"
                  placeholder="generado-automaticamente"
                />
                {slugManual && (
                  <button
                    onClick={() => { setSlugManual(false); set('slug', slugify(form.title)); }}
                    className="text-[10px] text-gray-600 hover:text-wow-gold transition-colors"
                    title="Regenerar desde título"
                  >
                    ↺ auto
                  </button>
                )}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                <FaAlignLeft className="text-wow-gold" /> Resumen
                <span className="ml-auto text-gray-600 font-normal normal-case">{form.summary.length}/500</span>
              </label>
              <textarea
                value={form.summary}
                onChange={e => set('summary', e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Descripción breve que aparece en los listados..."
                className="w-full bg-dark-900/60 border border-dark-600 focus:border-wow-gold/50 rounded-lg px-4 py-3 text-sm text-gray-300 placeholder-gray-600 outline-none resize-none transition-colors"
              />
            </div>

            {/* Contenido */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-700 flex items-center gap-2">
                <FaCode className="text-wow-gold text-xs" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contenido (HTML)</span>
                <span className="ml-auto text-[10px] text-gray-600">{form.content.length} chars</span>
              </div>
              <EditorToolbar
                textareaRef={contentRef}
                value={form.content}
                onChange={v => set('content', v)}
              />
              <textarea
                ref={contentRef}
                value={form.content}
                onChange={e => set('content', e.target.value)}
                rows={16}
                placeholder="<p>Contenido completo de la noticia en HTML...</p>"
                className="w-full bg-dark-900/40 border-0 px-5 py-4 text-sm text-gray-300 placeholder-gray-600 outline-none resize-none font-mono leading-relaxed"
              />
            </div>

            {/* Tags + Cover Image */}
            <div className="grid grid-cols-2 gap-5">

              {/* Tags */}
              <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <FaTags className="text-wow-gold" /> Etiquetas
                  <span className="ml-auto text-gray-600 font-normal normal-case">{tags.length}/5</span>
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="ej: parche"
                    maxLength={30}
                    disabled={tags.length >= 5}
                    className="flex-1 bg-dark-900/60 border border-dark-600 focus:border-wow-gold/50 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 outline-none transition-colors disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!tagInput.trim() || tags.length >= 5}
                    className="px-3 py-2 bg-wow-gold/10 border border-wow-gold/30 text-wow-gold rounded-lg text-xs hover:bg-wow-gold/20 transition-all disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-wow-gold/10 border border-wow-gold/20 text-wow-gold rounded-full">
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors">
                        <FaTimes className="text-[8px]" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Cover Image */}
              <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <FaImage className="text-wow-gold" /> Imagen de portada
                </label>
                <input
                  type="url"
                  value={form.cover_image}
                  onChange={e => set('cover_image', e.target.value)}
                  placeholder="https://cdn.example.com/imagen.jpg"
                  className="w-full bg-dark-900/60 border border-dark-600 focus:border-wow-gold/50 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 outline-none transition-colors mb-2"
                />
                {form.cover_image && (
                  <img
                    src={form.cover_image}
                    alt="preview"
                    className="w-full h-20 object-cover rounded-lg border border-dark-600"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                onClick={() => navigate('/news')}
                className="px-5 py-2.5 bg-dark-800 border border-dark-600 text-gray-400 hover:text-white rounded-lg text-sm transition-all hover:border-dark-500"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-dark-700 border border-dark-500 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40"
              >
                {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                Guardar borrador
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting || !form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-wow-gold to-yellow-600 text-dark-900 font-bold rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {submitting ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                Publicar noticia
              </button>
            </div>
          </div>

          {/* Panel de vista previa */}
          <AnimatePresence>
            {showPreview && <PreviewPanel form={form} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}