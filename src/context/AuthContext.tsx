import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../config/admins';
import { 
  signInWithGoogle, 
  signOut as signOutService,
  signInWithEmail as signInWithEmailService,
  signUpWithEmail as signUpWithEmailService
} from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isGuest: false,
  loading: true,
  error: null,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginAsGuest: () => {},
  logout: async () => {},
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we were in guest mode in this session
    const guestFlag = window.sessionStorage.getItem('pokeidle_is_guest');
    if (guestFlag === 'true') {
      setIsGuest(true);
      setLoading(false);
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(isUserAdmin(session.user));
        setIsGuest(false);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (in, out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsAdmin(isUserAdmin(session.user));
        setIsGuest(false);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Error logging in with Google", err);
      setError(err.message || "Error al iniciar sesión con Google");
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailService(email, password);
    } catch (err: any) {
      console.error("Error logging in with email", err);
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmailService(email, password);
    } catch (err: any) {
      console.error("Error registering with email", err);
      setError(err.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    setIsAdmin(false);
    window.sessionStorage.setItem('pokeidle_is_guest', 'true');
  };

  const logout = async () => {
    try {
      await signOutService();
      setIsGuest(false);
      setIsAdmin(false);
      window.sessionStorage.removeItem('pokeidle_is_guest');
      // Clear game data on logout as per security request
      window.sessionStorage.removeItem('pokeidle_run');
      window.sessionStorage.removeItem('pokeidle_meta');
      window.sessionStorage.removeItem('pokeidle_training');
    } catch (err: any) {
      console.error("Error logging out", err);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin,
      isGuest,
      loading, 
      error, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      loginAsGuest,
      logout,
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
