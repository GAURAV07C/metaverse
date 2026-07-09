import axios from 'axios';

export const API_URL = (import.meta as any).env?.VITE_APP_API_URL ?? 'http://localhost:3000/api/v1';


export const api = axios.create({
  baseURL: API_URL,
});

// Import token lazily to avoid circular dep at module init time
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('metaverse-user-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});
