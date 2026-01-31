import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { username: string; password: string; email: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  verifyToken: () => api.get('/auth/verify'),
};

// Server API
export const serverAPI = {
  getStatus: () => api.get('/server/status'),
  getStats: () => api.get('/server/stats'),
};

// Characters API
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
