import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { getOrCreateWebVisitorId } from '@/utils/webVisitorId';

// Use || so empty string in .env still falls back (?? only treats null/undefined).
const rawBase = import.meta.env.VITE_API_BASE_URL;
const baseURL =
  typeof rawBase === 'string' && rawBase.trim() !== '' ? rawBase.trim() : '/api';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const url = typeof config.url === 'string' ? config.url : '';
  if (url.startsWith('/chat/')) {
    config.headers['X-Web-Visitor-Id'] = getOrCreateWebVisitorId();
  }
  // Prefer store token (avoids race right after login) then localStorage
  try {
    const t = useAuthStore().token ?? localStorage.getItem('token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  } catch {
    const t = localStorage.getItem('token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Standalone chat has no login; do not hijack the page
      if (window.location.pathname.startsWith('/chat')) {
        return Promise.reject(err);
      }
      try {
        useAuthStore().logout();
      } catch {
        localStorage.removeItem('token');
      }
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
