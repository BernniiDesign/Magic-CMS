import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaUser, FaGamepad, FaCrown, FaBars, FaTimes } from 'react-icons/fa';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';

export default function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: FaHome, public: true },
    { path: '/dashboard', label: 'Dashboard', icon: FaGamepad, protected: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-wow-gold/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-3"
              >
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

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                if (item.protected && !isAuthenticated) return null;
                if (item.public || isAuthenticated) {
                  return (
                    <Link key={item.path} to={item.path}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative px-4 py-2"
                      >
                        <div className="flex items-center space-x-2">
                          <item.icon className={`text-lg ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-400'}`} />
                          <span className={`font-medium ${isActive(item.path) ? 'text-wow-gold' : 'text-gray-300 hover:text-white'} transition-colors`}>
                            {item.label}
                          </span>
                        </div>
                        {isActive(item.path) && (
                          <motion.div
                            layoutId="navbar-indicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-wow-gold to-transparent"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </motion.div>
                    </Link>
                  );
                }
                return null;
              })}
            </div>

            {/* User Section */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3 px-4 py-2 bg-dark-800/50 rounded-lg border border-wow-gold/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-wow-gold to-wow-ice rounded-full flex items-center justify-center">
                      <FaUser className="text-dark-900 text-sm" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">{user?.username}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={logout}
                    className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-lg border border-dark-600 hover:border-wow-gold/30 transition-all font-medium"
                  >
                    Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 text-gray-300 hover:text-white font-medium transition-colors"
                    >
                      Sign In
                    </motion.button>
                  </Link>
                  <Link to="/register">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative px-6 py-2 rounded-lg font-medium overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-wow-gold to-wow-ice opacity-100 group-hover:opacity-90 transition-opacity" />
                      <span className="relative text-dark-900 font-semibold">Get Started</span>
                    </motion.button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-dark-800/95 backdrop-blur-md border-t border-wow-gold/20"
            >
              <div className="px-4 py-4 space-y-3">
                {navItems.map((item) => {
                  if (item.protected && !isAuthenticated) return null;
                  if (item.public || isAuthenticated) {
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <motion.div
                          whileHover={{ x: 4 }}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                            isActive(item.path)
                              ? 'bg-wow-gold/10 border border-wow-gold/30'
                              : 'hover:bg-dark-700'
                          }`}
                        >
                          <item.icon className={isActive(item.path) ? 'text-wow-gold' : 'text-gray-400'} />
                          <span className={isActive(item.path) ? 'text-wow-gold font-medium' : 'text-gray-300'}>
                            {item.label}
                          </span>
                        </motion.div>
                      </Link>
                    );
                  }
                  return null;
                })}

                <div className="border-t border-dark-700 pt-3 mt-3 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center space-x-3 px-4 py-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-wow-gold to-wow-ice rounded-full flex items-center justify-center">
                          <FaUser className="text-dark-900 text-sm" />
                        </div>
                        <span className="text-sm font-medium text-gray-300">{user?.username}</span>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors text-left"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <button className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors">
                          Sign In
                        </button>
                      </Link>
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
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

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
}
