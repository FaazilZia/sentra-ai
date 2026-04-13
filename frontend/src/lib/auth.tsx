import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { loginRequest, fetchCurrentUser } from './api';

export type AppUser = User & {
  full_name?: string;
  tenant_id?: string;
  is_active?: boolean;
};

interface AuthContextValue {
  user: AppUser | null;
  accessToken: string | null;
  loading: boolean;
  loginPending: boolean;
  loginError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('sentra_access_token');
    
    // Auth Bypass for local development/demo
    if (!token && import.meta.env.VITE_BYPASS_AUTH === 'true') {
      console.info('🛡️ Sentra AI: Auth bypass enabled. Session restored with demo credentials.');
      setUser({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@sentra.ai',
        full_name: 'Demo Administrator',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        tenant_id: '00000000-0000-0000-0000-000000000000',
        is_active: true,
      } as any);
      setAccessToken('demo-bypass-token');
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    setAccessToken(token);
    fetchCurrentUser(token)
      .then((currentUser) => {
        setUser(currentUser as unknown as AppUser);
      })
      .catch(() => {
        localStorage.removeItem('sentra_access_token');
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(email: string, password: string) {
    setLoginPending(true);
    setLoginError(null);

    try {
      const { access_token } = await loginRequest(email, password);
      localStorage.setItem('sentra_access_token', access_token);
      setAccessToken(access_token);
      
      const currentUser = await fetchCurrentUser(access_token);
      setUser(currentUser as unknown as AppUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      setLoginError(message);
      throw error;
    } finally {
      setLoginPending(false);
    }
  }

  async function signUp(email: string, password: string) {
    setLoginPending(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      // Depending on config, email confirmation might be required.
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign up';
      setLoginError(message);
      throw error;
    } finally {
      setLoginPending(false);
    }
  }

  async function logout() {
    localStorage.removeItem('sentra_access_token');
    setUser(null);
    setAccessToken(null);
    setLoginError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        loginPending,
        loginError,
        login,
        signUp,
        logout,
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
