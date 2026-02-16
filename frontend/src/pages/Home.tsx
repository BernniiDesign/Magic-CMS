// frontend/src/pages/Home.tsx

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SnowEffect from '../components/SnowEffect';
import serverService, { ServerStats } from '../services/Server.service';
import toast from 'react-hot-toast';
import { 
  FaUsers, 
  FaServer, 
  FaClock, 
  FaShieldAlt,
  FaTrophy,
  FaDiscord,
  FaArrowRight
} from 'react-icons/fa';
import { 
  GiSwordsPower, 
  GiCrown,
  GiSpellBook,
  GiTwoCoins
} from 'react-icons/gi';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchServerStats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchServerStats = async () => {
    try {
      setLoading(true);
      const stats = await serverService.getServerStats();
      setServerStats(stats);
    } catch (error: any) {
      console.error('Error fetching server stats:', error);
      toast.error('Error al cargar estadísticas del servidor');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <GiSwordsPower className="text-4xl" />,
      title: 'Rates Balanceados',
      description: 'Experiencia x3, Drop x2, perfectamente equilibrados',
      color: 'from-red-600 to-orange-600'
    },
    {
      icon: <FaShieldAlt className="text-4xl" />,
      title: 'Anti-Cheat Activo',
      description: 'Sistema de seguridad avanzado contra trampas',
      color: 'from-blue-600 to-cyan-600'
    },
    {
      icon: <GiCrown className="text-4xl" />,
      title: 'Eventos Semanales',
      description: 'Torneos PvP, raids y recompensas exclusivas',
      color: 'from-purple-600 to-pink-600'
    },
    {
      icon: <GiSpellBook className="text-4xl" />,
      title: 'Contenido Custom',
      description: 'Mazmorras, items y misiones únicas del servidor',
      color: 'from-yellow-600 to-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] via-[#1a1f35] to-[#0a0e1a] text-white overflow-hidden">
      {/* ✨ Nieve de fondo */}
      <SnowEffect />

      {/* Hero Section */}
      <div className="relative z-10">
        {/* Background Image con overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ 
            backgroundImage: 'url(https://images.blz-contentstack.com/v3/assets/blt3452e3b114fab0cd/blt5b09d97470e5e4d6/620089e46ad04c17e8b4d1e4/wrath-classic-logo-tablet.jpg)',
            filter: 'blur(2px)'
          }}
        />
        
        <div className="relative container mx-auto px-4 py-20">
          {/* Logo y título */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-wow-gold via-yellow-400 to-wow-gold bg-clip-text text-transparent drop-shadow-2xl">
              WRATH OF THE LICH KING
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 font-semibold tracking-wide">
              3.3.5a • Reinos de Aventura Ilimitada
            </p>
          </motion.div>

          {/* CTA Buttons - Solo si NO está autenticado */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <button
                onClick={() => navigate('/register')}
                className="group relative px-8 py-4 bg-gradient-to-r from-wow-gold to-yellow-600 text-dark-900 font-bold text-lg rounded-lg hover:shadow-2xl hover:shadow-wow-gold/50 transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Crear Cuenta Gratis
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-wow-gold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              </button>

              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-dark-800/80 backdrop-blur-sm border-2 border-wow-gold/50 text-wow-gold font-bold text-lg rounded-lg hover:bg-dark-700/80 hover:border-wow-gold transition-all duration-300 hover:scale-105"
              >
                Iniciar Sesión
              </button>
            </motion.div>
          )}

          {/* Stats del servidor - Solo si está autenticado */}
          {isAuthenticated && !loading && serverStats && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-16"
            >
              <ServerStatsSection stats={serverStats} username={user?.username} />
            </motion.div>
          )}

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 bg-dark-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent"
          >
            ¿Por Qué Elegirnos?
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative bg-dark-800/60 backdrop-blur-sm rounded-xl p-6 border border-dark-600 hover:border-wow-gold/50 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300`} />
                
                <div className={`bg-gradient-to-br ${feature.color} w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>

                <h3 className="text-xl font-bold mb-2 text-wow-gold group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-dark-800/80 to-dark-900/80 backdrop-blur-sm rounded-2xl p-12 border-2 border-wow-gold/30 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">
              Únete a la Comunidad
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Más de 15,000 jugadores ya se han unido a nuestra aventura. 
              ¡Sé parte de la leyenda!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => window.open('https://discord.gg/yourserver', '_blank')}
                className="group px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-lg rounded-lg transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <FaDiscord className="text-2xl" />
                Únete a Discord
              </button>

              {!isAuthenticated && (
                <button
                  onClick={() => navigate('/download')}
                  className="px-8 py-4 bg-dark-700/80 backdrop-blur-sm border-2 border-wow-gold/50 text-wow-gold font-bold text-lg rounded-lg hover:bg-dark-600/80 hover:border-wow-gold transition-all duration-300 hover:scale-105"
                >
                  Descargar Cliente
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-dark-700/50 bg-dark-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 WotLK Server. Todos los derechos reservados.</p>
          <p className="mt-2">
            World of Warcraft y Blizzard Entertainment son marcas registradas de Blizzard Entertainment, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ==================== COMPONENTES ====================

function QuickStatCard({ 
  icon, 
  value, 
  label, 
  color 
}: { 
  icon: React.ReactNode; 
  value: string; 
  label: string; 
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-dark-800/60 backdrop-blur-sm rounded-lg p-4 border border-dark-600 hover:border-wow-gold/30 transition-all"
    >
      <div className={`bg-gradient-to-br ${color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-3 mx-auto`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
    </motion.div>
  );
}

function ServerStatsSection({ 
  stats, 
  username 
}: { 
  stats: ServerStats;
  username?: string;
}) {
  return (
    <div className="bg-dark-800/60 backdrop-blur-sm rounded-xl p-6 border-2 border-wow-gold/30 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-wow-gold flex items-center gap-2">
          <FaServer className="text-xl" />
          Estado del Servidor
        </h3>
        <div className="flex items-center gap-4">
          {username && (
            <span className="text-sm text-gray-400">
              Bienvenido, <span className="text-wow-gold font-semibold">{username}</span>
            </span>
          )}
          <span className="flex items-center gap-2 text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            En línea
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Online Players */}
        <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center gap-3 mb-2">
            <FaUsers className="text-blue-400 text-2xl" />
            <div>
              <div className="text-3xl font-bold text-white">{stats.onlinePlayers}</div>
              <div className="text-xs text-gray-400">Jugadores Conectados</div>
            </div>
          </div>
        </div>

        {/* Total Accounts */}
        <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center gap-3 mb-2">
            <GiTwoCoins className="text-yellow-400 text-2xl" />
            <div>
              <div className="text-3xl font-bold text-white">{stats.totalAccounts.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Cuentas Registradas</div>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-dark-900/50 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center gap-3 mb-2">
            <FaClock className="text-green-400 text-2xl" />
            <div>
              <div className="text-3xl font-bold text-white">{stats.uptime}</div>
              <div className="text-xs text-gray-400">Disponibilidad</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Players */}
      <div className="mt-6 pt-6 border-t border-dark-600">
        <h4 className="text-lg font-bold text-wow-gold mb-4 flex items-center gap-2">
          <GiCrown className="text-xl" />
          Top Jugadores
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.topPlayers.map((player, idx) => (
            <div 
              key={idx}
              className="bg-dark-900/50 rounded-lg p-3 border border-dark-600 flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx === 0 ? 'bg-yellow-500 text-dark-900' :
                idx === 1 ? 'bg-gray-400 text-dark-900' :
                'bg-orange-600 text-white'
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{player.name}</div>
                <div className="text-xs text-gray-400">Nivel {player.level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}