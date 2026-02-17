// frontend/src/components/CommunitySidebar.tsx

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaUsers, FaServer, FaDiscord, FaTwitter, FaYoutube,
  FaClock, FaTwitch, FaSkull
} from 'react-icons/fa';
import { GiCrown, GiCrossedSwords, GiSwordsPower } from 'react-icons/gi';
import api from '../services/api';

const CLASS_COLORS: Record<number, string> = {
  1: '#C69B6D', 2: '#F48CBA', 3: '#AAD372', 4: '#FFF468',
  5: '#FFFFFF', 6: '#C41E3A', 7: '#0070DD', 8: '#3FC7EB',
  9: '#8788EE', 11: '#FF7C0A',
};

const CLASS_NAMES: Record<number, string> = {
  1: 'Guerrero', 2: 'Paladín', 3: 'Cazador', 4: 'Pícaro',
  5: 'Sacerdote', 6: 'Cballero M.', 7: 'Chamán', 8: 'Mago',
  9: 'Brujo', 11: 'Druida',
};

interface SidebarStats {
  onlinePlayers: number;
  maxPlayers: number;
  online: boolean;
}

interface TopKiller {
  guid: number;
  name: string;
  level: number;
  class: number;
  totalKills: number;
}

export default function CommunitySidebar() {
  const [status, setStatus] = useState<SidebarStats | null>(null);
  const [topKillers, setTopKillers] = useState<TopKiller[]>([]);

  useEffect(() => {
    fetchStatus();
    fetchTopKillers();
    const interval = setInterval(fetchStatus, 60_000); // refresh cada 60s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/server/status');
      setStatus(data.status);
    } catch { /* silent */ }
  };

  const fetchTopKillers = async () => {
    try {
      const { data } = await api.get('/server/top-killers');
      setTopKillers(data.killers || []);
    } catch { /* silent */ }
  };

  return (
    <aside className="w-72 shrink-0 space-y-4">

      {/* ── SERVER STATUS ────────────────────────────── */}
      <SideCard title="Estado del Servidor" icon={<FaServer className="text-wow-gold" />}>
        {status ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status.online ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-sm font-semibold ${status.online ? 'text-green-400' : 'text-red-400'}`}>
                  {status.online ? 'En línea' : 'Caído'}
                </span>
              </div>
              <span className="text-xs text-gray-500">Realm: Lordaeron</span>
            </div>

            <div className="bg-dark-900/60 rounded-lg p-3 border border-dark-600">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <FaUsers className="text-blue-400 text-xs" />
                  Jugadores
                </div>
                <span className="text-sm font-bold text-white">
                  {status.onlinePlayers}
                  <span className="text-gray-500 font-normal"> / {status.maxPlayers}</span>
                </span>
              </div>
              {/* Barra de progreso */}
              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((status.onlinePlayers / status.maxPlayers) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-dark-900/60 rounded-lg p-2 border border-dark-600 text-center">
                <FaClock className="text-wow-gold text-xs mx-auto mb-1" />
                <div className="text-xs text-gray-400">Versión</div>
                <div className="text-xs font-bold text-white">3.3.5a</div>
              </div>
              <div className="bg-dark-900/60 rounded-lg p-2 border border-dark-600 text-center">
                <GiSwordsPower className="text-orange-400 text-xs mx-auto mb-1" />
                <div className="text-xs text-gray-400">Rates XP</div>
                <div className="text-xs font-bold text-white">x3</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-dark-600 border-t-wow-gold" />
          </div>
        )}
      </SideCard>

      {/* ── TOP KILLERS ──────────────────────────────── */}
      <SideCard title="Top Asesinos" icon={<FaSkull className="text-red-400" />}>
        {topKillers.length > 0 ? (
          <div className="space-y-2">
            {topKillers.map((p, idx) => (
              <motion.div
                key={p.guid}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2.5 bg-dark-900/50 rounded-lg px-3 py-2 border border-dark-700 hover:border-dark-500 transition-colors"
              >
                {/* Rank */}
                <span className={`text-xs font-bold w-4 shrink-0 ${
                  idx === 0 ? 'text-yellow-400' :
                  idx === 1 ? 'text-gray-400' :
                  idx === 2 ? 'text-orange-500' : 'text-gray-600'
                }`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </span>

                {/* Nombre + clase */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-semibold truncate"
                    style={{ color: CLASS_COLORS[p.class] || '#fff' }}
                  >
                    {p.name}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {CLASS_NAMES[p.class]} · Nv {p.level}
                  </div>
                </div>

                {/* Kills */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-red-400">
                    {p.totalKills.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-600">kills</div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-3">Sin datos disponibles</p>
        )}
        <Link
          to="/armory"
          className="mt-3 block text-center text-xs text-wow-gold hover:text-yellow-400 transition-colors"
        >
          Ver Armory completa →
        </Link>
      </SideCard>

      {/* ── REDES SOCIALES ───────────────────────────── */}
      <SideCard title="Comunidad" icon={<GiCrown className="text-wow-gold" />}>
        <div className="space-y-2">
          <SocialLink
            href="https://discord.gg/yourserver"
            icon={<FaDiscord className="text-xl" />}
            label="Discord"
            sub="Únete al servidor"
            color="bg-[#5865F2]/20 border-[#5865F2]/40 hover:border-[#5865F2]/80 text-[#7289DA]"
          />
          <SocialLink
            href="https://twitter.com/yourserver"
            icon={<FaTwitter className="text-xl" />}
            label="Twitter"
            sub="Síguenos"
            color="bg-[#1DA1F2]/20 border-[#1DA1F2]/40 hover:border-[#1DA1F2]/80 text-[#1DA1F2]"
          />
          <SocialLink
            href="https://youtube.com/yourchannel"
            icon={<FaYoutube className="text-xl" />}
            label="YouTube"
            sub="Trailers y guías"
            color="bg-[#FF0000]/20 border-[#FF0000]/40 hover:border-[#FF0000]/80 text-[#FF4444]"
          />
          <SocialLink
            href="https://twitch.tv/yourstream"
            icon={<FaTwitch className="text-xl" />}
            label="Twitch"
            sub="Streams en vivo"
            color="bg-[#9146FF]/20 border-[#9146FF]/40 hover:border-[#9146FF]/80 text-[#9146FF]"
          />
        </div>
      </SideCard>

      {/* ── NAVEGACIÓN RÁPIDA ────────────────────────── */}
      <SideCard title="Explorar" icon={<GiCrossedSwords className="text-wow-gold" />}>
        <div className="space-y-1">
          {[
            { to: '/news', label: 'Noticias', icon: '📰' },
            { to: '/devblog', label: 'Blog de Dev', icon: '⚙️' },
            { to: '/forum', label: 'Foros', icon: '💬' },
            { to: '/armory', label: 'Armory', icon: '⚔️' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-400 hover:text-wow-gold hover:bg-dark-800/60 transition-all text-sm"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </SideCard>

    </aside>
  );
}

// ── Componentes auxiliares ─────────────────────────────────────

function SideCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/80 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-700/60 bg-dark-900/40">
        {icon}
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SocialLink({ href, icon, label, sub, color }: {
  href: string; icon: React.ReactNode;
  label: string; sub: string; color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${color}`}
    >
      {icon}
      <div>
        <div className="text-xs font-bold">{label}</div>
        <div className="text-[10px] text-gray-500">{sub}</div>
      </div>
    </a>
  );
}