// frontend/src/pages/Home.tsx

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import SnowEffect from '../components/SnowEffect';
import serverService, { ServerStats } from '../services/Server.service';
import { serverAPI, communityAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FaUsers, FaServer, FaClock, FaShieldAlt,
  FaDiscord, FaArrowRight, FaTwitter, FaYoutube, FaTwitch,
  FaNewspaper, FaSkull, FaStar
} from 'react-icons/fa';
import {
  GiSwordsPower, GiCrown, GiSpellBook, GiTwoCoins,
  GiCrossedSwords, GiSwordsEmblem
} from 'react-icons/gi';
import { useAuthStore } from '../store/authStore';

// ── Colores de clase WoW ──────────────────────────────────────
const CLASS_COLORS: Record<number, string> = {
  1: '#C69B6D', 2: '#F48CBA', 3: '#AAD372', 4: '#FFF468',
  5: '#FFFFFF', 6: '#C41E3A', 7: '#0070DD', 8: '#3FC7EB',
  9: '#8788EE', 11: '#FF7C0A',
};
const CLASS_NAMES: Record<number, string> = {
  1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue',
  5: 'Priest',  6: 'DK',      7: 'Shaman', 8: 'Mage',
  9: 'Warlock', 11: 'Druid',
};

const SOCIAL = [
  { icon: FaDiscord, label: 'Discord', url: 'https://discord.gg/yourserver',   color: '#5865F2', bg: 'from-[#5865F2]/20 to-[#4752C4]/5' },
  { icon: FaTwitter, label: 'Twitter', url: 'https://twitter.com/yourserver',  color: '#1DA1F2', bg: 'from-[#1DA1F2]/20 to-[#0d86d3]/5' },
  { icon: FaYoutube, label: 'YouTube', url: 'https://youtube.com/yourserver',  color: '#FF0000', bg: 'from-[#FF0000]/20 to-[#cc0000]/5'  },
  { icon: FaTwitch,  label: 'Twitch',  url: 'https://twitch.tv/yourserver',    color: '#9146FF', bg: 'from-[#9146FF]/20 to-[#7c3aed]/5'  },
];

const FEATURES = [
  { icon: <GiSwordsPower className="text-4xl" />, title: 'Rates Balanceados',   description: 'XP x3, Drop x2, perfectamente equilibrados', color: 'from-red-600 to-orange-600'    },
  { icon: <FaShieldAlt   className="text-4xl" />, title: 'Anti-Cheat Activo',   description: 'Sistema de seguridad avanzado contra trampas', color: 'from-blue-600 to-cyan-600'    },
  { icon: <GiCrown       className="text-4xl" />, title: 'Eventos Semanales',   description: 'Torneos PvP, raids y recompensas exclusivas',   color: 'from-purple-600 to-pink-600'  },
  { icon: <GiSpellBook   className="text-4xl" />, title: 'Contenido Custom',    description: 'Mazmorras, items y misiones únicas',            color: 'from-yellow-600 to-orange-600' },
];

// ══════════════════════════════════════════════════════════════
export default function Home() {
// ══════════════════════════════════════════════════════════════
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [serverStats,  setServerStats]  = useState<ServerStats | null>(null);
  const [serverStatus, setServerStatus] = useState<{ online: boolean; onlinePlayers: number; maxPlayers: number } | null>(null);
  const [topKillers,   setTopKillers]   = useState<any[]>([]);
  const [latestNews,   setLatestNews]   = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    loadPublicData();
    if (isAuthenticated) loadPrivateData();
  }, [isAuthenticated]);

  const loadPublicData = async () => {
    try {
      const [statusRes, killersRes, newsRes] = await Promise.allSettled([
        serverAPI.getStatus(),
        serverAPI.getTopKillers(5),
        communityAPI.getNews(1),
      ]);
      if (statusRes.status  === 'fulfilled') setServerStatus(statusRes.value.data.status);
      if (killersRes.status === 'fulfilled') setTopKillers(killersRes.value.data.killers ?? []);
      if (newsRes.status    === 'fulfilled') setLatestNews((newsRes.value.data.news ?? []).slice(0, 4));
    } catch (e) { console.error('[Home] public data:', e); }
    finally { setLoading(false); }
  };

  const loadPrivateData = async () => {
    try { setServerStats(await serverService.getServerStats()); }
    catch (e) { console.error('[Home] private data:', e); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] via-[#1a1f35] to-[#0a0e1a] text-white overflow-hidden">
      <SnowEffect />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <div className="relative z-10">
        <div className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(https://images.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt5b09d97470e5e4d6/620089e46ad04c17e8b4d1e4/wrath-classic-logo-tablet.jpg)', filter: 'blur(2px)' }}
        />
        <div className="relative container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-3 bg-gradient-to-r from-wow-gold via-yellow-400 to-wow-gold bg-clip-text text-transparent drop-shadow-2xl">
              WRATH OF THE LICH KING
            </h1>
            <p className="text-lg md:text-xl text-gray-300 font-semibold tracking-wide">
              3.3.5a • Reinos de Aventura Ilimitada
            </p>
          </motion.div>

          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10"
            >
              <button onClick={() => navigate('/register')}
                className="group px-8 py-4 bg-gradient-to-r from-wow-gold to-yellow-600 text-dark-900 font-bold text-lg rounded-lg hover:shadow-2xl hover:shadow-wow-gold/40 transition-all hover:scale-105 flex items-center gap-2"
              >
                Crear Cuenta Gratis <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/login')}
                className="px-8 py-4 bg-dark-800/80 border-2 border-wow-gold/50 text-wow-gold font-bold text-lg rounded-lg hover:bg-dark-700/80 hover:border-wow-gold transition-all hover:scale-105"
              >
                Iniciar Sesión
              </button>
            </motion.div>
          )}

          {isAuthenticated && serverStats && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
              <StatsPanel stats={serverStats} username={user?.username} />
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── Layout 2 columnas ──────────────────────────────── */}
      <div className="relative z-10 container mx-auto px-4 pb-20">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Columna principal ──────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-14">

            {/* Banners de noticias */}
            <section>
              <SectionHeading icon={<FaNewspaper />} title="Últimas Noticias" linkTo="/news" linkLabel="Ver todas" />
              {loading ? (
                <SkeletonGrid />
              ) : latestNews.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {latestNews.map((n, i) => <NewsCard key={n.id ?? i} news={n} index={i} />)}
                </div>
              ) : (
                <MockNewsCards />
              )}
            </section>

            {/* Features */}
            <section>
              <SectionHeading icon={<GiSwordsEmblem />} title="¿Por Qué Elegirnos?" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {FEATURES.map((f, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                    className={`group relative bg-dark-800/60 rounded-xl p-5 border border-dark-600 hover:border-wow-gold/40 transition-all overflow-hidden`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className={`bg-gradient-to-br ${f.color} w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      {f.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-1 text-wow-gold group-hover:text-white transition-colors">{f.title}</h3>
                    <p className="text-gray-400 text-sm">{f.description}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="bg-gradient-to-r from-dark-800/80 to-dark-900/80 rounded-2xl p-10 border-2 border-wow-gold/25 text-center"
            >
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">
                Únete a la Comunidad
              </h2>
              <p className="text-gray-300 mb-7 max-w-xl mx-auto">
                Más de 15,000 jugadores ya se han unido a nuestra aventura.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => window.open('https://discord.gg/yourserver', '_blank')}
                  className="px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-lg rounded-lg hover:scale-105 transition-all flex items-center gap-3 justify-center"
                >
                  <FaDiscord className="text-2xl" /> Únete a Discord
                </button>
                {!isAuthenticated && (
                  <button onClick={() => navigate('/download')}
                    className="px-8 py-4 bg-dark-700/80 border-2 border-wow-gold/50 text-wow-gold font-bold text-lg rounded-lg hover:bg-dark-600/80 hover:border-wow-gold hover:scale-105 transition-all"
                  >
                    Descargar Cliente
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Sidebar derecho ─────────────────────────────── */}
          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-5 lg:sticky lg:top-20">
            <ServerStatusCard status={serverStatus} loading={loading} />
            <TopKillersCard   killers={topKillers}  loading={loading} />
            <ServerInfoCard />
            <SocialCard />
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-dark-700/50 bg-dark-900/50">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 WotLK Server. Todos los derechos reservados.</p>
          <p className="mt-1">World of Warcraft es marca registrada de Blizzard Entertainment, Inc.</p>
        </div>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HELPERS UI
// ══════════════════════════════════════════════════════════════

function SectionHeading({ icon, title, linkTo, linkLabel }: { icon: React.ReactNode; title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <span className="w-1 h-7 bg-gradient-to-b from-wow-gold to-yellow-600 rounded-full" />
        <span className="text-wow-gold">{icon}</span>
        <span className="bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">{title}</span>
      </h2>
      {linkTo && (
        <Link to={linkTo}>
          <motion.span whileHover={{ x: 3 }} className="text-sm text-wow-gold/60 hover:text-wow-gold flex items-center gap-1 transition-colors">
            {linkLabel} <FaArrowRight className="text-xs" />
          </motion.span>
        </Link>
      )}
    </div>
  );
}

function SideCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
      className="bg-dark-800/60 backdrop-blur-sm rounded-xl border border-dark-700/80 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-dark-700/60 flex items-center gap-2">
        <span className="text-wow-gold text-sm">{icon}</span>
        <h3 className="text-xs font-bold text-wow-gold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-48 bg-dark-800/50 rounded-xl animate-pulse border border-dark-700" />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR CARDS
// ══════════════════════════════════════════════════════════════

function ServerStatusCard({ status, loading }: { status: any; loading: boolean }) {
  const online    = status?.online ?? false;
  const players   = status?.onlinePlayers ?? 0;
  const maxP      = status?.maxPlayers ?? 5000;
  const pct       = Math.min(100, Math.round((players / maxP) * 100));

  return (
    <SideCard title="Estado del Servidor" icon={<FaServer />}>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-dark-700 rounded" />)}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Estado</span>
            <span className={`flex items-center gap-1.5 text-sm font-semibold ${online ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {online ? 'En Línea' : 'Offline'}
            </span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Jugadores online</span>
              <span className="text-wow-gold font-semibold">{players.toLocaleString()} / {maxP.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, delay: 0.4 }}
                className="h-full bg-gradient-to-r from-wow-gold to-yellow-500 rounded-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-dark-900/50 rounded-lg p-2.5 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Versión</div>
              <div className="text-xs font-bold text-wow-gold">3.3.5a</div>
            </div>
            <div className="bg-dark-900/50 rounded-lg p-2.5 text-center">
              <div className="text-xs text-gray-500 mb-0.5">XP Rate</div>
              <div className="text-xs font-bold text-green-400">x3</div>
            </div>
          </div>
        </div>
      )}
    </SideCard>
  );
}

function TopKillersCard({ killers, loading }: { killers: any[]; loading: boolean }) {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <SideCard title="Top Killers" icon={<GiCrossedSwords />}>
      {loading ? (
        <div className="space-y-2.5 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-dark-700 rounded-lg" />)}
        </div>
      ) : killers.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-3">Sin datos disponibles</p>
      ) : (
        <div className="space-y-2">
          {killers.map((k, idx) => {
            const color = CLASS_COLORS[k.class] ?? '#ffffff';
            return (
              <motion.div key={k.guid ?? idx}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-dark-900/40 hover:bg-dark-900/70 transition-colors"
              >
                <span className="text-base w-5 text-center flex-shrink-0">
                  {medals[idx] ?? <span className="text-xs font-bold text-gray-500">{idx + 1}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold truncate block" style={{ color }}>{k.name}</span>
                  <span className="text-xs text-gray-600">{CLASS_NAMES[k.class] ?? ''} lv.{k.level}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <FaSkull className="text-red-500/60 text-xs" />
                  <span className="text-xs font-bold text-red-400">{(k.totalKills ?? 0).toLocaleString()}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </SideCard>
  );
}

function ServerInfoCard() {
  const info = [
    { label: 'XP',     value: 'x3',    color: 'text-green-400'  },
    { label: 'Gold',   value: 'x2',    color: 'text-yellow-400' },
    { label: 'Drop',   value: 'x2',    color: 'text-blue-400'   },
    { label: 'PvP',    value: 'Activo', color: 'text-red-400'   },
    { label: 'Core',   value: 'Trinity', color: 'text-gray-400' },
    { label: 'Uptime', value: '99.8%',  color: 'text-green-400' },
  ];
  return (
    <SideCard title="Info del Servidor" icon={<FaStar />}>
      <div className="space-y-2">
        {info.map(r => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{r.label}</span>
            <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </SideCard>
  );
}

function SocialCard() {
  return (
    <SideCard title="Síguenos" icon={<FaUsers />}>
      <div className="grid grid-cols-2 gap-2">
        {SOCIAL.map(s => (
          <motion.a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gradient-to-br ${s.bg} border border-white/5 hover:border-white/15 transition-all group cursor-pointer`}
          >
            <s.icon className="text-xl group-hover:scale-110 transition-transform" style={{ color: s.color }} />
            <span className="text-xs text-gray-300 font-medium">{s.label}</span>
          </motion.a>
        ))}
      </div>
    </SideCard>
  );
}

// ══════════════════════════════════════════════════════════════
// BANNERS DE NOTICIAS
// ══════════════════════════════════════════════════════════════

function NewsCard({ news, index }: { news: any; index: number }) {
  const tags: string[] = (news.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
  const date = news.created_at ? new Date(news.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className="group bg-dark-800/60 rounded-xl border border-dark-700/80 hover:border-wow-gold/30 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Portada */}
      {news.cover_image ? (
        <div className="h-36 bg-cover bg-center relative overflow-hidden flex-shrink-0"
          style={{ backgroundImage: `url(${news.cover_image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent" />
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-wow-gold/8 via-dark-800 to-dark-900 flex items-center justify-center relative overflow-hidden flex-shrink-0">
          <FaNewspaper className="text-wow-gold/15 text-5xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/60 to-transparent" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold/80 rounded-full border border-wow-gold/15">
                {tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-bold text-white group-hover:text-wow-gold transition-colors line-clamp-2 mb-2 text-sm leading-snug flex-1">
          {news.title}
        </h3>

        {news.summary && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-3 leading-relaxed">{news.summary}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-dark-700/40">
          <span className="text-xs text-gray-600">{date}</span>
          <Link to={`/news/${news.slug}`}>
            <motion.span whileHover={{ x: 2 }}
              className="text-xs text-wow-gold/60 hover:text-wow-gold flex items-center gap-1 transition-colors"
            >
              Leer más <FaArrowRight className="text-xs" />
            </motion.span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function MockNewsCards() {
  const mocks = [
    { title: 'Patch 3.3.5 — Actualización del servidor',      summary: 'Mejoras de rendimiento y nuevas correcciones de bugs en el núcleo.',        tag: 'Actualización', slug: 'patch-update',     color: 'from-blue-600/8'   },
    { title: 'Evento Naxxramas — Recompensas dobles',         summary: 'Este fin de semana doble botín en todas las alas de Naxxramas.',             tag: 'Evento',        slug: 'naxx-event',       color: 'from-purple-600/8' },
    { title: 'Nueva temporada de Arenas — Temporada 8',       summary: 'La temporada de arenas ya está disponible con puntuaciones reiniciadas.',    tag: 'PvP',           slug: 'arena-season',     color: 'from-red-600/8'    },
    { title: 'Mantenimiento programado — Domingo 4am',        summary: 'El servidor tendrá mantenimiento preventivo de aprox. 30 minutos.',          tag: 'Aviso',         slug: 'maintenance',      color: 'from-yellow-600/8' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {mocks.map((m, idx) => (
        <motion.article key={idx}
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: idx * 0.07 }}
          whileHover={{ y: -4 }}
          className={`group bg-gradient-to-br ${m.color} via-dark-800 to-dark-900 rounded-xl border border-dark-700/80 hover:border-wow-gold/30 transition-all p-4 flex flex-col`}
        >
          <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold/80 rounded-full border border-wow-gold/15 mb-2 w-fit">
            {m.tag}
          </span>
          <h3 className="font-bold text-white group-hover:text-wow-gold transition-colors text-sm mb-2 leading-snug flex-1">
            {m.title}
          </h3>
          <p className="text-gray-400 text-xs line-clamp-2 mb-3">{m.summary}</p>
          <Link to="/news">
            <motion.span whileHover={{ x: 2 }}
              className="text-xs text-wow-gold/60 hover:text-wow-gold flex items-center gap-1 transition-colors w-fit"
            >
              Ver noticias <FaArrowRight className="text-xs" />
            </motion.span>
          </Link>
        </motion.article>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PANEL STATS AUTENTICADO
// ══════════════════════════════════════════════════════════════

function StatsPanel({ stats, username }: { stats: ServerStats; username?: string }) {
  return (
    <div className="bg-dark-800/60 rounded-xl p-5 border-2 border-wow-gold/30 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-wow-gold flex items-center gap-2">
          <FaServer /> Estado del Servidor
        </h3>
        <div className="flex items-center gap-3">
          {username && (
            <span className="text-sm text-gray-400">
              Bienvenido, <span className="text-wow-gold font-semibold">{username}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> En línea
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <FaUsers className="text-blue-400 text-lg" />,       value: stats.onlinePlayers,                       label: 'Online' },
          { icon: <GiTwoCoins className="text-yellow-400 text-lg" />,  value: stats.totalAccounts?.toLocaleString(),     label: 'Cuentas' },
          { icon: <FaClock className="text-green-400 text-lg" />,      value: stats.uptime,                              label: 'Uptime' },
        ].map((s, i) => (
          <div key={i} className="bg-dark-900/50 rounded-lg p-3 border border-dark-600 flex items-center gap-2.5">
            {s.icon}
            <div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}