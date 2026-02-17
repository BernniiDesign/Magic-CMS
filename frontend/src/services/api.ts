// frontend/src/services/api.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ==================== REQUEST INTERCEPTOR ====================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    console.log('📤 [API] Request:', config.method?.toUpperCase(), config.url);

    if (token) {
      if (token.split('.').length === 3) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ [API] Token agregado');
      } else {
        console.error('❌ [API] Token malformado');
        useAuthStore.getState().logout();
      }
    } else {
      console.warn('⚠️ [API] No hay token disponible');
    }

    return config;
  },
  (error) => {
    console.error('❌ [API] Request error:', error);
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

    console.log('❌ [API] Response error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      message: error.response?.data?.message,
    });

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      console.error('❌ [API] Refresh ya intentado, redirigiendo a login');
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

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
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    console.log('🔄 [API] Intentando refresh token...');

    try {
      const response = await api.post('/auth/refresh', undefined, {
        headers: { ...originalRequest.headers },
        _retry: true,
      } as any);

      const { accessToken } = response.data;

      console.log('✅ [API] Token refrescado exitosamente');

      if (!accessToken || accessToken.split('.').length !== 3) {
        throw new Error('Invalid refresh token received');
      }

      useAuthStore.getState().updateAccessToken(accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      processQueue(null, accessToken);
      return api(originalRequest);

    } catch (refreshError: any) {
      console.error('❌ [API] Refresh token falló:', refreshError);
      processQueue(refreshError, null);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
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
  getStatus: () =>
    api.get('/server/status'),

  getStats: () =>
    api.get('/server/stats'),

  // ← NUEVO: usado por CommunitySidebar
  getTopKillers: (limit = 5) =>
    api.get(`/server/top-killers?limit=${limit}`),
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

// ← NUEVO: endpoints de comunidad (foros, noticias, devblog)
export const communityAPI = {
  // Foros
  getForumCategories: () =>
    api.get('/community/forums'),

  getThreadsByCategory: (categoryId: number, page = 1) =>
    api.get(`/community/forums/${categoryId}/threads?page=${page}`),

  getThread: (threadId: number, page = 1) =>
    api.get(`/community/forums/thread/${threadId}?page=${page}`),

  createThread: (data: { categoryId: number; title: string; content: string }) =>
    api.post('/community/forums/thread', data),

  replyThread: (threadId: number, content: string) =>
    api.post(`/community/forums/thread/${threadId}/reply`, { content }),

  // Noticias
  getNews: (page = 1) =>
    api.get(`/community/news?page=${page}`),

  getNewsPost: (slug: string) =>
    api.get(`/community/news/${slug}`),

  // DevBlog
  getDevBlog: (page = 1) =>
    api.get(`/community/devblog?page=${page}`),

  getDevBlogPost: (slug: string) =>
    api.get(`/community/devblog/${slug}`),
};

export default api;