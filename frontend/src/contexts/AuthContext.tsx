// frontend/src/contexts/AuthContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  accountId: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verificar token con el servidor
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token inválido
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al iniciar sesión');
      }

      const data = await response.json();
      
      // Guardar token
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      setUser(data.user);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    
    // Opcional: Llamar endpoint de logout en el servidor
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(err => console.error('Error en logout:', err));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  
  return context;
}