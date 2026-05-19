import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchCurrentUser, loginRequest, registerRequest } from './api';

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
  signUp: (email: string, password: string, fullName?: string, organizationName?: string) => Promise<void>;
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
    // Listen for auth expiration events from api.ts
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleAuthExpired);

    // Auth Bypass for local development/demo
    if (import.meta.env.VITE_BYPASS_AUTH === 'true') {
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
      setAccessToken('demo-active-token');
      setLoading(false);
      return;
    }

    // Attempt to fetch current user directly using browser credentials (cookies)
    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setAccessToken('session-valid');
      })
      .catch(() => {
        setUser(null);
        setAccessToken(null);
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
      const { user: loggedInUser } = await loginRequest(email, password);
      setAccessToken('session-valid');
      setUser(loggedInUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      setLoginError(message);
      throw error;
    } finally {
      setLoginPending(false);
    }
  }

  async function signUp(email: string, password: string, fullName?: string, organizationName?: string) {
    setLoginPending(true);
    setLoginError(null);

    try {
      const derivedName = fullName?.trim() || email.split('@')[0] || 'Sentra User';
      const derivedOrg = organizationName?.trim() || 
        `${email.split('@')[1]?.split('.')[0]?.toUpperCase() || 'Sentra Org'} Workspace`;

      await registerRequest({
        email,
        password,
        fullName: derivedName,
        organizationName: derivedOrg,
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

  async function logout() {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      await fetch(`${baseUrl}/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
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
