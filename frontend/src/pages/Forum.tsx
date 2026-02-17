// frontend/src/pages/Forum.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaComments, FaThumbtack, FaLock, FaPlus, FaBullhorn, FaBug, FaLightbulb } from 'react-icons/fa';
import { GiSwordsPower, GiCrossedSwords, GiCrown } from 'react-icons/gi';
import CommunitySidebar from '../components/CommunitySidebar';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  FaBullhorn:     <FaBullhorn />,
  FaComments:     <FaComments />,
  GiSwordsPower:  <GiSwordsPower />,
  GiCrossedSwords:<GiCrossedSwords />,
  GiCrown:        <GiCrown />,
  FaBug:          <FaBug />,
  FaLightbulb:    <FaLightbulb />,
};

interface Category {
  id: number; name: string; description: string;
  icon: string; thread_count: number;
}

export default function Forum() {
  const { isAuthenticated } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/community/forums')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0f1525] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-wow-gold to-yellow-500 bg-clip-text text-transparent">
                Foros
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Discute estrategias, reporta bugs, busca guild y más
              </p>
            </div>
            {isAuthenticated && (
              <Link
                to="/forum/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-wow-gold to-yellow-600 text-dark-900 font-bold rounded-lg hover:opacity-90 transition-opacity text-sm"
              >
                <FaPlus /> Nuevo Hilo
              </Link>
            )}
          </div>
          <div className="h-px bg-gradient-to-r from-wow-gold/40 via-wow-gold/20 to-transparent mt-4" />
        </motion.div>

        {/* Layout con sidebar */}
        <div className="flex gap-6 items-start">

          {/* Categorías */}
          <div className="flex-1 space-y-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-dark-600 border-t-wow-gold" />
              </div>
            ) : (
              categories.map((cat, idx) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link to={`/forum/category/${cat.id}`}>
                    <div className="group bg-dark-800/50 hover:bg-dark-700/60 backdrop-blur-sm rounded-xl border border-dark-700 hover:border-wow-gold/40 transition-all p-5 flex items-center gap-4">
                      {/* Icono */}
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-wow-gold/20 to-yellow-600/10 border border-wow-gold/30 flex items-center justify-center text-wow-gold text-xl shrink-0 group-hover:scale-110 transition-transform">
                        {CATEGORY_ICONS[cat.icon] || <FaComments />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white group-hover:text-wow-gold transition-colors">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">{cat.description}</p>
                      </div>

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-wow-gold">{cat.thread_count}</div>
                        <div className="text-xs text-gray-500">hilos</div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>

          <CommunitySidebar />
        </div>
      </div>
    </div>
  );
}