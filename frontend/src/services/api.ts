// frontend/src/services/api.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api';

// ==================== AXIOS INSTANCE ====================

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Necesario para cookies httpOnly
});

// ==================== REQUEST INTERCEPTOR ====================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    
    console.log('📤 [API] Request:', config.method?.toUpperCase(), config.url);
    console.log('📤 [API] Token presente:', !!token);
    
    if (token) {
      // CRÍTICO: Validar que el token tenga formato JWT antes de enviarlo
      if (token.split('.').length === 3) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ [API] Token agregado al header');
      } else {
        console.error('❌ [API] Token malformado detectado, no se envía:', token.substring(0, 20) + '...');
        // Limpiar el token corrupto del store
        useAuthStore.getState().logout();
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ==================== RESPONSE INTERCEPTOR ====================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    console.log('❌ [API] Response error:', error.response?.status, error.response?.data);

    // Si el error NO es 401, o ya reintentamos, rechazar inmediatamente
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Si el error es "TOKEN_EXPIRED", intentar refresh
    if (error.response?.data?.message === 'TOKEN_EXPIRED' || 
        error.response?.data?.message === 'Invalid or expired token') {
      
      // Si ya estamos refrescando, poner en cola
      if (isRefreshing) {
        console.log('⏳ [API] Refresh en progreso, agregando a cola');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      console.log('🔄 [API] Intentando refresh token...');

      try {
        // Llamar al endpoint de refresh
        const response = await api.post('/auth/refresh', {}, {
          _retry: true, // Evitar loop infinito
        } as any);

        const { accessToken } = response.data;

        console.log('✅ [API] Token refrescado exitosamente');
        console.log('✅ [API] Nuevo token válido:', accessToken.split('.').length === 3);

        // CRÍTICO: Validar que el nuevo token sea válido
        if (!accessToken || accessToken.split('.').length !== 3) {
          throw new Error('Refresh token inválido recibido del servidor');
        }

        // Actualizar el store
        useAuthStore.getState().updateAccessToken(accessToken);

        // Actualizar el header de la request original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Procesar la cola
        processQueue(null, accessToken);

        // Reintentar la request original
        return api(originalRequest);

      } catch (refreshError: any) {
        console.error('❌ [API] Refresh token falló:', refreshError);
        
        processQueue(refreshError, null);
        
        // Limpiar autenticación
        useAuthStore.getState().logout();
        
        // Redirigir a login
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ==================== API METHODS ====================

export const authAPI = {
  register: (data: { username: string; password: string; email: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () =>
    api.post('/auth/logout'),
  
  logoutAll: () =>
    api.post('/auth/logout-all'),
  
  refreshToken: () =>
    api.post('/auth/refresh'),
  
  getMe: () =>
    api.get('/auth/me'),
};

export const serverAPI = {
  getStatus: () => api.get('/server/status'),
  getStats: () => api.get('/server/stats'),
};

export const charactersAPI = {
  getAccountCharacters: (accountId: number) =>
    api.get(`/characters/account/${accountId}`),
  
  getCharacter: (guid: number) =>
    api.get(`/characters/${guid}`),
  
  getCharacterDetails: (guid: number) =>
    api.get(`/characters/${guid}/details`),
  
  getTopCharacters: (limit: number = 100) =>
    api.get(`/characters/top?limit=${limit}`),
};

export default api;