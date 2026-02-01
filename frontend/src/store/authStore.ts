// frontend/src/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  
  // Actions
  setAuth: (user: User, accessToken: string) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
  setRefreshing: (isRefreshing: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isRefreshing: false,

      setAuth: (user, accessToken) => {
        console.log('🔐 [AUTH STORE] Guardando autenticación:', { 
          user, 
          tokenLength: accessToken.length 
        });
        
        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      updateAccessToken: (accessToken) => {
        console.log('🔄 [AUTH STORE] Actualizando access token');
        set({ accessToken });
      },

      setRefreshing: (isRefreshing) => {
        set({ isRefreshing });
      },

      logout: () => {
        console.log('🚪 [AUTH STORE] Cerrando sesión');
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);