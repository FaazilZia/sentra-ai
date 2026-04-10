import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

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
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser((session?.user as AppUser) ?? null);
      setAccessToken(session?.access_token ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((session?.user as AppUser) ?? null);
      setAccessToken(session?.access_token ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    setLoginPending(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
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
    await supabase.auth.signOut();
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
