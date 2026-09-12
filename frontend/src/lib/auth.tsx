import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchCurrentUser, loginRequest, registerRequest, refreshSession, apiRequest, ApiError, setImpersonationToken } from './api';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  full_name?: string; // Legacy alias for compatibility
  role: string;
  organizationId?: string;
  organizationName?: string;
  is_active?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  originalUser: AppUser | null;
  accessToken: string | null;
  loading: boolean;
  loginPending: boolean;
  loginError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string, organizationName?: string) => Promise<void>;
  logout: () => Promise<void>;
  impersonate: (userId: string) => Promise<void>;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [originalUser, setOriginalUser] = useState<AppUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth expiration events from api.ts
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleAuthExpired as EventListener);

    // Auth Bypass for local development/demo
    if (import.meta.env.VITE_BYPASS_AUTH === 'true') {
      console.info('🛡️ Sentraa AI: Auth bypass enabled. Session restored with demo credentials.');
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

    // Attempt to restore session: mint a fresh access token via HTTP-only refresh cookie, then fetch user profile
    refreshSession()
      .then(async (refreshRes) => {
        if (refreshRes?.accessToken) {
          setAccessToken(refreshRes.accessToken);
          try {
            const currentUser = await fetchCurrentUser();
            setUser(currentUser);
          } catch {
            setUser(null);
            setAccessToken(null);
          }
        } else {
          setUser(null);
          setAccessToken(null);
        }
      })
      .catch(() => {
        setUser(null);
        setAccessToken(null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired as EventListener);
    };
  }, []);

  async function login(email: string, password: string) {
    setLoginPending(true);
    setLoginError(null);

    try {
      const result = await loginRequest(email, password);
      setAccessToken(result.accessToken || null);
      setUser(result.user);
      setOriginalUser(null);
      setImpersonationToken(null);
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
      const derivedName = fullName?.trim() || email.split('@')[0] || 'Sentraa User';
      const derivedOrg = organizationName?.trim() || 
        `${email.split('@')[1]?.split('.')[0]?.toUpperCase() || 'Sentraa Org'} Workspace`;

      await registerRequest({
        email,
        password,
        fullName: derivedName,
        organizationName: derivedOrg,
      });
      await login(email, password);
    } catch (error) {
      let message = 'Unable to sign up';
      if (error instanceof ApiError) {
        if (error.data?.errors && Array.isArray(error.data.errors)) {
          message = error.data.errors.map((e: any) => e.message).join('. ');
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      setLoginError(message);
      throw error;
    } finally {
      setLoginPending(false);
    }
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      }, false);
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    setImpersonationToken(null);
    setAccessToken(null);
    setUser(null);
    setOriginalUser(null);
    setLoginError(null);
  }

  async function impersonate(userId: string) {
    try {
      const res = await apiRequest<{ token: string; user: AppUser }>(`/superadmin/impersonate/${userId}`, {
        method: 'POST',
      });
      setImpersonationToken(res.token);
      setOriginalUser(user);
      setUser(res.user);
      setAccessToken(res.token);
    } catch (err: any) {
      console.error('Impersonation failed:', err);
      throw err;
    }
  }

  function exitImpersonation() {
    setImpersonationToken(null);
    if (originalUser) {
      setUser(originalUser);
      setAccessToken(null);
      setOriginalUser(null);
    }
  }

  const value = useMemo(() => ({
    user,
    originalUser,
    accessToken,
    loading,
    loginPending,
    loginError,
    login,
    signUp,
    logout,
    impersonate,
    exitImpersonation,
  }), [user, originalUser, accessToken, loading, loginPending, loginError]);

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
