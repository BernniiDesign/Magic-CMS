// frontend/src/App.tsx

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';

// ── Carga estática — núcleo crítico del bundle inicial ────────
// Solo Home se carga de forma estática porque es la primera página
// que ve cualquier visitante. El resto se carga bajo demanda.
import Home from './pages/Home';

// ── Carga diferida (lazy) — cada página es un chunk separado ──
// El bundle inicial se reduce ~60-70%. Cada chunk se descarga
// solo cuando el usuario navega a esa ruta por primera vez.

// Auth
const Login    = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Usuario
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Noticias — News.tsx exporta dos componentes nombrados
const NewsList = lazy(() =>
  import('./pages/News').then(m => ({ default: m.NewsList }))
);
const NewsPost = lazy(() =>
  import('./pages/News').then(m => ({ default: m.NewsPost }))
);

// DevBlog — mismo patrón de exports nombrados
const DevBlogList = lazy(() =>
  import('./pages/DevBlog').then(m => ({ default: m.DevBlogList }))
);
const DevBlogPost = lazy(() =>
  import('./pages/DevBlog').then(m => ({ default: m.DevBlogPost }))
);

// Foro
const Forum          = lazy(() => import('./pages/Forum'));
const ForumThread    = lazy(() => import('./pages/ForumThread'));
const NewForumThread = lazy(() => import('./pages/NewForumThread'));

// Creación de contenido (admin)
const CreateNews    = lazy(() => import('./pages/CreateNews'));
const CreateDevBlog = lazy(() => import('./pages/CreateDevBlog'));

// ── Query client ──────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

// ── Fallback de carga ─────────────────────────────────────────
// Pantalla mínima mientras se descarga el chunk de la página.
// Mantiene el mismo fondo oscuro del tema para evitar flash blanco.
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-wow-gold border-t-transparent animate-spin" />
        <span className="text-xs text-gray-600 tracking-widest uppercase">Cargando</span>
      </div>
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// ── Rutas animadas ────────────────────────────────────────────

function AnimatedRoutes() {
  const location = useLocation();

  return (
    // Suspense envuelve TODAS las rutas — cualquier lazy page
    // mostrará el PageLoader mientras se descarga su chunk.
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

          {/* ── Públicas ──────────────────────────────────────── */}
          <Route path="/"
            element={<PageTransition><Home /></PageTransition>} />

          <Route path="/news"
            element={<PageTransition><NewsList /></PageTransition>} />
          <Route path="/news/:slug"
            element={<PageTransition><NewsPost /></PageTransition>} />

          <Route path="/devblog"
            element={<PageTransition><DevBlogList /></PageTransition>} />
          <Route path="/devblog/:slug"
            element={<PageTransition><DevBlogPost /></PageTransition>} />

          <Route path="/forum"
            element={<PageTransition><Forum /></PageTransition>} />
          <Route path="/forum/category/:categoryId"
            element={<PageTransition><Forum /></PageTransition>} />
          <Route path="/forum/thread/:threadId"
            element={<PageTransition><ForumThread /></PageTransition>} />

          {/* ── Auth (solo visitantes sin sesión) ─────────────── */}
          <Route path="/login"
            element={
              <PublicRoute>
                <PageTransition><Login /></PageTransition>
              </PublicRoute>
            }
          />
          <Route path="/register"
            element={
              <PublicRoute>
                <PageTransition><Register /></PageTransition>
              </PublicRoute>
            }
          />

          {/* ── Privadas (requieren JWT) ───────────────────────── */}
          <Route path="/dashboard"
            element={
              <PrivateRoute>
                <PageTransition><Dashboard /></PageTransition>
              </PrivateRoute>
            }
          />

          {/* Creación de contenido — backend aplica RBAC adicional */}
          <Route path="/forum/new"
            element={
              <PrivateRoute>
                <PageTransition><NewForumThread /></PageTransition>
              </PrivateRoute>
            }
          />
          <Route path="/news/new"
            element={
              <PrivateRoute>
                <PageTransition><CreateNews /></PageTransition>
              </PrivateRoute>
            }
          />
          <Route path="/devblog/new"
            element={
              <PrivateRoute>
                <PageTransition><CreateDevBlog /></PageTransition>
              </PrivateRoute>
            }
          />

          {/* ── Fallback ──────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

// ── App root ──────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a26',
              color:      '#fff',
              border:     '1px solid #ffd700',
            },
            success: { iconTheme: { primary: '#ffd700', secondary: '#0a0a0f' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff'    } },
          }}
        />
        <Navbar />
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;