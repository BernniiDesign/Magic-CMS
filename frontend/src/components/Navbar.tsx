// frontend/src/components/Navbar.tsx

import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaUser, FaGamepad, FaCrown, FaBars, FaTimes,
  FaNewspaper, FaComments, FaCode, FaChevronDown, FaPlus
} from 'react-icons/fa';
import { GiGearHammer } from 'react-icons/gi';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { useState, useRef, useEffect } from 'react';

const mainNav = [
  { path: '/',          label: 'Inicio',    icon: FaHome,    publicRoute: true },
  { path: '/dashboard', label: 'Dashboard', icon: FaGamepad, protected: true  },
];

const communityItems = [
  { path: '/news',    label: 'Noticias', icon: FaNewspaper },
  { path: '/devblog', label: 'Dev Blog', icon: GiGearHammer },
  { path: '/forum',   label: 'Foros',    icon: FaComments  },
];

// Rutas de creación — solo visibles según permisos RBAC
const createItems = [
  {
    path: '/news/new',
    label: 'Nueva Noticia',
    icon: FaNewspaper,
    permission: 'canCreateNews' as const,
  },
  {
    path: '/devblog/new',
    label: 'Nuevo Dev Post',
    icon: GiGearHammer,
    permission: 'canCreateDevBlog' as const,
  },
  {
    path: '/forum/new',
    label: 'Nuevo Hilo',
    icon: FaComments,
    permission: 'canCreateThread' as const,
  },
];

export default function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const permissions = usePermissions();

  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [mobileComOpen, setMobileComOpen] = useState(false);
  const [mobileCrtOpen, setMobileCrtOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const createRef   = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const isCommunityActive = communityItems.some(i => isActive(i.path));
  const isCreateActive    = createItems.some(i => isActive(i.path));

  // Cierra dropdowns al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
      if (createRef.current && !createRef.current.contains(e.target as Node))
        setCreateOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cierra el menú móvil al navegar
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
    setCreateOpen(false);
  }, [location.pathname]);

  // Items de creación visibles según permisos del usuario actual
  const visibleCreateItems = createItems.filter(item => permissions[item.permission]);
  const hasCreateItems = visibleCreateItems.length > 0;

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-wow-gold/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-wow-gold/20 blur-xl rounded-full" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-wow-gold via-wow-blue to-wow-ice rounded-lg flex items-center justify-center">
                    <FaCrown className="text-white text-xl" />
                  </div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-wow-gold via-white to-wow-ice bg-clip-text text-transparent">
                  Trinity
                </span>
              </motion.div>
            </Link>

            {/* ── Desktop nav ──────────────────────────────────── */}
            <div className="hidden md:flex items-center space-x-1">

              {mainNav.map((item) => {
                if (item.protected && !isAuthenticated) return null;
                return (
                  <Link key={item.path} to={item.path}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <item.icon className={`text-lg ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-400'}`} />
                        <span className={`font-medium transition-colors ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-300 hover:text-white'}`}>
                          {item.label}
                        </span>
                      </div>
                      {isActive(item.path) && (
                        <motion.div layoutId="navbar-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-wow-gold to-transparent"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}

              {/* Dropdown — Comunidad */}
              <div ref={dropdownRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setDropdownOpen(v => !v)}
                  className="relative px-4 py-2 flex items-center space-x-2"
                >
                  <FaComments className={`text-lg ${isCommunityActive ? 'text-wow-gold' : 'text-gray-400'}`} />
                  <span className={`font-medium transition-colors ${isCommunityActive ? 'text-wow-gold' : 'text-gray-300 hover:text-white'}`}>
                    Comunidad
                  </span>
                  <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <FaChevronDown className="text-xs text-gray-500 ml-1" />
                  </motion.div>
                  {isCommunityActive && (
                    <motion.div layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-wow-gold to-transparent"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-dark-800/98 backdrop-blur-md border border-wow-gold/20 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
                    >
                      {communityItems.map((item, idx) => (
                        <Link key={item.path} to={item.path} onClick={() => setDropdownOpen(false)}>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex items-center space-x-3 px-4 py-3 hover:bg-wow-gold/10 transition-colors group ${
                              isActive(item.path) ? 'bg-wow-gold/10 border-l-2 border-wow-gold' : ''
                            }`}
                          >
                            <item.icon className={`text-sm ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-500 group-hover:text-wow-gold/70'} transition-colors`} />
                            <span className={`text-sm font-medium ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-300 group-hover:text-white'} transition-colors`}>
                              {item.label}
                            </span>
                          </motion.div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dropdown — Crear (solo si hay items visibles) */}
              {isAuthenticated && hasCreateItems && (
                <div ref={createRef} className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setCreateOpen(v => !v)}
                    className={`relative px-4 py-2 flex items-center space-x-2 rounded-lg transition-colors ${
                      isCreateActive
                        ? 'text-wow-gold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <FaPlus className="text-sm" />
                    <span className="font-medium text-sm">Crear</span>
                    <motion.div animate={{ rotate: createOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <FaChevronDown className="text-xs text-gray-500 ml-1" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {createOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-52 bg-dark-800/98 backdrop-blur-md border border-wow-gold/20 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
                      >
                        {/* Encabezado del dropdown */}
                        <div className="px-4 py-2.5 border-b border-dark-700/60">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Publicar contenido
                          </p>
                        </div>

                        {visibleCreateItems.map((item, idx) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setCreateOpen(false)}
                          >
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`flex items-center space-x-3 px-4 py-3 hover:bg-wow-gold/10 transition-colors group ${
                                isActive(item.path) ? 'bg-wow-gold/10 border-l-2 border-wow-gold' : ''
                              }`}
                            >
                              <item.icon className={`text-sm ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-500 group-hover:text-wow-gold/70'} transition-colors`} />
                              <span className={`text-sm font-medium ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-300 group-hover:text-white'} transition-colors`}>
                                {item.label}
                              </span>
                            </motion.div>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </div>

            {/* ── User section ─────────────────────────────────── */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3 px-4 py-2 bg-dark-800/50 rounded-lg border border-wow-gold/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-wow-gold to-wow-ice rounded-full flex items-center justify-center">
                      <FaUser className="text-dark-900 text-sm" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-300 leading-none">
                        {user?.username}
                      </span>
                      {permissions.isAdmin && (
                        <span className="text-[9px] text-wow-gold font-semibold uppercase tracking-wider mt-0.5">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={logout}
                    className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-lg border border-dark-600 hover:border-wow-gold/30 transition-all font-medium"
                  >
                    Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 text-gray-300 hover:text-white font-medium transition-colors"
                    >
                      Sign In
                    </motion.button>
                  </Link>
                  <Link to="/register">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="relative px-6 py-2 rounded-lg font-medium overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-wow-gold to-wow-ice opacity-100 group-hover:opacity-90 transition-opacity" />
                      <span className="relative text-dark-900 font-semibold">Get Started</span>
                    </motion.button>
                  </Link>
                </>
              )}
            </div>

            {/* ── Mobile button ─────────────────────────────────── */}
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </motion.button>
          </div>
        </div>

        {/* ── Mobile menu ──────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-dark-800/95 backdrop-blur-md border-t border-wow-gold/20"
            >
              <div className="px-4 py-4 space-y-2">

                {mainNav.map((item) => {
                  if (item.protected && !isAuthenticated) return null;
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                      <motion.div whileHover={{ x: 4 }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                          isActive(item.path) ? 'bg-wow-gold/10 border border-wow-gold/30' : 'hover:bg-dark-700'
                        }`}
                      >
                        <item.icon className={isActive(item.path) ? 'text-wow-gold' : 'text-gray-400'} />
                        <span className={isActive(item.path) ? 'text-wow-gold font-medium' : 'text-gray-300'}>
                          {item.label}
                        </span>
                      </motion.div>
                    </Link>
                  );
                })}

                {/* Comunidad collapsible */}
                <div>
                  <button
                    onClick={() => setMobileComOpen(v => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg ${
                      isCommunityActive ? 'bg-wow-gold/10 border border-wow-gold/30' : 'hover:bg-dark-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FaComments className={isCommunityActive ? 'text-wow-gold' : 'text-gray-400'} />
                      <span className={isCommunityActive ? 'text-wow-gold font-medium' : 'text-gray-300'}>
                        Comunidad
                      </span>
                    </div>
                    <motion.div animate={{ rotate: mobileComOpen ? 180 : 0 }}>
                      <FaChevronDown className="text-gray-500 text-xs" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {mobileComOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-4 mt-1 space-y-1 border-l border-wow-gold/20 pl-3"
                      >
                        {communityItems.map((item) => (
                          <Link key={item.path} to={item.path}
                            onClick={() => { setMobileOpen(false); setMobileComOpen(false); }}
                          >
                            <motion.div whileHover={{ x: 4 }}
                              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg ${
                                isActive(item.path) ? 'bg-wow-gold/10' : 'hover:bg-dark-700'
                              }`}
                            >
                              <item.icon className={`text-sm ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-500'}`} />
                              <span className={`text-sm ${isActive(item.path) ? 'text-wow-gold font-medium' : 'text-gray-400'}`}>
                                {item.label}
                              </span>
                            </motion.div>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Crear — solo si el usuario tiene permisos */}
                {isAuthenticated && hasCreateItems && (
                  <div>
                    <button
                      onClick={() => setMobileCrtOpen(v => !v)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg ${
                        isCreateActive ? 'bg-wow-gold/10 border border-wow-gold/30' : 'hover:bg-dark-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <FaPlus className={isCreateActive ? 'text-wow-gold' : 'text-gray-400'} />
                        <span className={isCreateActive ? 'text-wow-gold font-medium' : 'text-gray-300'}>
                          Crear
                        </span>
                      </div>
                      <motion.div animate={{ rotate: mobileCrtOpen ? 180 : 0 }}>
                        <FaChevronDown className="text-gray-500 text-xs" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {mobileCrtOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-4 mt-1 space-y-1 border-l border-wow-gold/20 pl-3"
                        >
                          {visibleCreateItems.map((item) => (
                            <Link key={item.path} to={item.path}
                              onClick={() => { setMobileOpen(false); setMobileCrtOpen(false); }}
                            >
                              <motion.div whileHover={{ x: 4 }}
                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg ${
                                  isActive(item.path) ? 'bg-wow-gold/10' : 'hover:bg-dark-700'
                                }`}
                              >
                                <item.icon className={`text-sm ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-500'}`} />
                                <span className={`text-sm ${isActive(item.path) ? 'text-wow-gold font-medium' : 'text-gray-400'}`}>
                                  {item.label}
                                </span>
                              </motion.div>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Auth section */}
                <div className="border-t border-dark-700 pt-3 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center space-x-3 px-4 py-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-wow-gold to-wow-ice rounded-full flex items-center justify-center">
                          <FaUser className="text-dark-900 text-sm" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-300">{user?.username}</span>
                          {permissions.isAdmin && (
                            <span className="text-[9px] text-wow-gold font-semibold uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => { logout(); setMobileOpen(false); }}
                        className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors text-left"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>
                        <button className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors">
                          Sign In
                        </button>
                      </Link>
                      <Link to="/register" onClick={() => setMobileOpen(false)}>
                        <button className="w-full px-4 py-3 bg-gradient-to-r from-wow-gold to-wow-ice text-dark-900 font-semibold rounded-lg">
                          Get Started
                        </button>
                      </Link>
                    </>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer para que el contenido no quede bajo la navbar fija */}
      <div className="h-16" />
    </>
  );
}