import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext({});

// Deterministic user resolution for local / offline fallback
function getOrCreateLocalUser(email, fullName = '') {
  const normalizedEmail = (email || 'demo.user@aurafinance.app').toLowerCase().trim();
  let registry = {};
  try {
    registry = JSON.parse(localStorage.getItem('prospera_user_registry') || '{}');
  } catch {
    registry = {};
  }

  if (registry[normalizedEmail]) {
    return registry[normalizedEmail];
  }

  // Create a stable deterministic hex hash from normalizedEmail
  let hash = 0;
  for (let i = 0; i < normalizedEmail.length; i++) {
    hash = ((hash << 5) - hash) + normalizedEmail.charCodeAt(i);
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  const cleanPrefix = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'user';
  const deterministicId = `local_${cleanPrefix}_${hexHash}`;

  const newUser = {
    id: deterministicId,
    email: normalizedEmail,
    user_metadata: {
      full_name: fullName || normalizedEmail.split('@')[0]
    }
  };

  registry[normalizedEmail] = newUser;
  localStorage.setItem('prospera_user_registry', JSON.stringify(registry));
  return newUser;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (mounted && currentSession) {
            setSession(currentSession);
            setUser(currentSession.user || null);
          }
        } catch (err) {
          console.error('Error fetching Supabase session:', err);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (mounted) {
              setSession(newSession);
              setUser(newSession?.user || null);
              setLoading(false);
            }
          }
        );

        if (mounted) {
          const savedLocalUser = localStorage.getItem('prospera_active_user') || localStorage.getItem('aura_demo_user');
          if (savedLocalUser && !session) {
            try {
              const parsed = JSON.parse(savedLocalUser);
              setUser(parsed);
            } catch {
              localStorage.removeItem('prospera_active_user');
              localStorage.removeItem('aura_demo_user');
            }
          }
          setLoading(false);
        }
        return () => subscription.unsubscribe();
      } else {
        // Local demo session for offline testing
        const savedLocalUser = localStorage.getItem('prospera_active_user') || localStorage.getItem('aura_demo_user');
        if (savedLocalUser) {
          try {
            const parsed = JSON.parse(savedLocalUser);
            if (mounted) setUser(parsed);
          } catch {
            localStorage.removeItem('prospera_active_user');
            localStorage.removeItem('aura_demo_user');
          }
        }
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch user currency preference when user logs in
  useEffect(() => {
    if (user) {
      api.get('/settings/profile')
        .then((res) => {
          if (res.data?.currency) {
            setCurrency(res.data.currency);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const updateCurrency = async (newCurrency) => {
    setCurrency(newCurrency);
    try {
      await api.put('/settings/profile', { currency: newCurrency });
    } catch (err) {
      console.warn('Could not save currency preference:', err);
    }
  };

  const signUp = async (email, password, fullName = '') => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        if (data?.session) {
          setSession(data.session);
          setUser(data.user);
        }
        return data;
      } catch (err) {
        if (err.message && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('network'))) {
          console.warn('Supabase network unreachable, creating deterministic local user');
          const localUser = getOrCreateLocalUser(email, fullName);
          localStorage.setItem('prospera_active_user', JSON.stringify(localUser));
          setUser(localUser);
          return { user: localUser };
        }
        throw err;
      }
    } else {
      const localUser = getOrCreateLocalUser(email, fullName);
      localStorage.setItem('prospera_active_user', JSON.stringify(localUser));
      setUser(localUser);
      return { user: localUser };
    }
  };

  const signIn = async (email, password) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        setSession(data.session);
        setUser(data.user);
        localStorage.removeItem('prospera_active_user');
        localStorage.removeItem('aura_demo_user');
        return data;
      } catch (err) {
        if (err.message && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('network'))) {
          console.warn('Supabase network unreachable, falling back to deterministic local login');
          const localUser = getOrCreateLocalUser(email);
          localStorage.setItem('prospera_active_user', JSON.stringify(localUser));
          setUser(localUser);
          return { user: localUser };
        }
        throw err;
      }
    } else {
      const localUser = getOrCreateLocalUser(email);
      localStorage.setItem('prospera_active_user', JSON.stringify(localUser));
      setUser(localUser);
      return { user: localUser };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    localStorage.removeItem('prospera_active_user');
    localStorage.removeItem('aura_demo_user');
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        currency,
        updateCurrency,
        signUp,
        signIn,
        signOut,
        resetPassword,
        isSupabaseConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
