import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext({});

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
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession?.user || null);
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

        if (mounted) setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        // Local demo session for offline testing
        const savedDemoUser = localStorage.getItem('aura_demo_user');
        if (savedDemoUser) {
          try {
            const parsed = JSON.parse(savedDemoUser);
            if (mounted) setUser(parsed);
          } catch {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) throw error;
      return data;
    } else {
      // Demo signup
      const demoUser = {
        id: 'demo_' + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: { full_name: fullName || email.split('@')[0] }
      };
      localStorage.setItem('aura_demo_user', JSON.stringify(demoUser));
      setUser(demoUser);
      return { user: demoUser };
    }
  };

  const signIn = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    } else {
      // Demo login
      const demoUser = {
        id: 'demo_' + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: { full_name: email.split('@')[0] }
      };
      localStorage.setItem('aura_demo_user', JSON.stringify(demoUser));
      setUser(demoUser);
      return { user: demoUser };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
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
