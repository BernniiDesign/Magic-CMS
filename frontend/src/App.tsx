// frontend/src/App.tsx — RUTAS ACTUALIZADAS
// Reemplaza solo la sección de imports y AnimatedRoutes

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';

// Pages existentes
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

// Pages de comunidad — NUEVAS
import Forum from './pages/Forum';
import ForumThread from './pages/ForumThread';
import { NewsList, NewsPost } from './pages/News';
import { DevBlogList, DevBlogPost } from './pages/DevBlog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* ── Públicas ── */}
        <Route path="/"         element={<PageTransition><Home /></PageTransition>} />
        <Route path="/news"     element={<PageTransition><NewsList /></PageTransition>} />
        <Route path="/news/:slug" element={<PageTransition><NewsPost /></PageTransition>} />
        <Route path="/devblog"  element={<PageTransition><DevBlogList /></PageTransition>} />
        <Route path="/devblog/:slug" element={<PageTransition><DevBlogPost /></PageTransition>} />
        <Route path="/forum"    element={<PageTransition><Forum /></PageTransition>} />
        <Route path="/forum/category/:categoryId" element={<PageTransition><Forum /></PageTransition>} />
        <Route path="/forum/thread/:threadId" element={<PageTransition><ForumThread /></PageTransition>} />

        {/* ── Auth ── */}
        <Route path="/login"    element={<PublicRoute><PageTransition><Login /></PageTransition></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><PageTransition><Register /></PageTransition></PublicRoute>} />

        {/* ── Privadas ── */}
        <Route path="/dashboard" element={<PrivateRoute><PageTransition><Dashboard /></PageTransition></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1a1a26', color: '#fff', border: '1px solid #ffd700' },
            success: { iconTheme: { primary: '#ffd700', secondary: '#0a0a0f' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Navbar />
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;