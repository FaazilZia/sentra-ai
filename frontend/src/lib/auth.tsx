import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchCurrentUser, loginRequest, registerRequest, googleLoginRequest } from './api';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  full_name?: string; // Legacy alias for compatibility
  role: string;
  organizationId?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  accessToken: string | null;
  loading: boolean;
  loginPending: boolean;
  loginError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('sentra_access_token'));
  const [loading, setLoading] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth expiration events from api.ts
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleAuthExpired);

    const token = localStorage.getItem('sentra_access_token');
    
    // Auth Bypass for local development/demo
    if (!token && import.meta.env.VITE_BYPASS_AUTH === 'true') {
      console.info('🛡️ Sentra AI: Auth bypass enabled. Session restored with demo credentials.');
      setUser({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@sentra.ai',
        fullName: 'Demo Administrator',
        role: 'admin',
        organizationId: 'demo-org-id',
        created_at: new Date().toISOString(),
        is_active: true,
      } as any);
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    // Attempt to fetch current user (api.ts will use the token in localStorage)
    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  async function login(email: string, password: string) {
    setLoginPending(true);
    setLoginError(null);

    try {
      // loginRequest in api.ts automatically stores tokens in localStorage
      const { user: loggedInUser, accessToken: token } = await loginRequest(email, password);
      setAccessToken(token);
      setUser(loggedInUser);
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
      await registerRequest({
        email,
        password,
        fullName: email.split('@')[0] || 'Sentra User',
      });
      await login(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign up';
      setLoginError(message);
      throw error;
    } finally {
      setLoginPending(false);
    }
  }

  async function googleLogin(idToken: string) {
    setLoginPending(true);
    setLoginError(null);
    try {
      const { user: loggedInUser, accessToken: token } = await googleLoginRequest(idToken);
      setAccessToken(token);
      setUser(loggedInUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      setLoginError(message);
      throw error;
    } finally {
      setLoginPending(false);
    }
  }

  async function logout() {
    localStorage.removeItem('sentra_access_token');
    localStorage.removeItem('sentra_refresh_token');
    setAccessToken(null);
    setUser(null);
    setLoginError(null);
  }

  const value = useMemo(() => ({
    user,
    accessToken,
    loading,
    loginPending,
    loginError,
    login,
    signUp,
    googleLogin,
    logout,
  }), [user, accessToken, loading, loginPending, loginError]);

  return (
    <AuthContext.Provider value={value}>
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
