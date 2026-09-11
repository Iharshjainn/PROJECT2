import axios from 'axios';
import { supabase, isSupabaseConfigured } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor injecting Supabase JWT
api.interceptors.request.use(async (config) => {
  try {
    if (isSupabaseConfigured) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        return config;
      }
    }
    
    // Fallback demo/local session token
    const localUser = localStorage.getItem('prospera_active_user') || localStorage.getItem('aura_demo_user');
    if (localUser) {
      const user = JSON.parse(localUser);
      config.headers.Authorization = `Bearer test_user_${user.id || 'demo_1'}`;
    }
  } catch (err) {
    console.warn('Could not inject auth token:', err);
  }
  return config;
});

// Response interceptor handling session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired or invalid
      console.warn('Unauthorized session detected');
    }
    return Promise.reject(error);
  }
);

export default api;
