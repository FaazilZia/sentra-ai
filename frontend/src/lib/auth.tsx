import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchCurrentUser, loginRequest, registerRequest, apiBaseUrl, apiRequest } from './api';

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
    window.addEventListener('auth:expired', handleAuthExpired);

    // Impersonation check
    const impToken = localStorage.getItem('sentra_impersonation_token');
    const impUserRaw = localStorage.getItem('sentra_impersonated_user');
    const origUserRaw = localStorage.getItem('sentra_original_user');

    if (impToken && impUserRaw && origUserRaw) {
      try {
        setUser(JSON.parse(impUserRaw));
        setAccessToken(impToken);
        setOriginalUser(JSON.parse(origUserRaw));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('sentra_original_user');
        localStorage.removeItem('sentra_impersonation_token');
        localStorage.removeItem('sentra_impersonated_user');
      }
    }

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

    // Attempt to fetch current user directly using browser credentials (cookies)
    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        const storedToken = localStorage.getItem('sentra_access_token');
        setAccessToken(storedToken);
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
      const result = await loginRequest(email, password);
      localStorage.setItem('sentra_access_token', result.accessToken);
      setAccessToken(result.accessToken);
      setUser(result.user);
      setOriginalUser(null);
      localStorage.removeItem('sentra_original_user');
      localStorage.removeItem('sentra_impersonation_token');
      localStorage.removeItem('sentra_impersonated_user');
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
      const message = error instanceof Error ? error.message : 'Unable to sign up';
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
    localStorage.removeItem('sentra_access_token');
    localStorage.removeItem('sentra_original_user');
    localStorage.removeItem('sentra_impersonation_token');
    localStorage.removeItem('sentra_impersonated_user');
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
      // Store original admin user
      localStorage.setItem('sentra_original_user', JSON.stringify(user));
      // Store impersonated token & user
      localStorage.setItem('sentra_impersonation_token', res.token);
      localStorage.setItem('sentra_impersonated_user', JSON.stringify(res.user));

      setOriginalUser(user);
      setUser(res.user);
      setAccessToken(res.token);
      window.location.href = '/app';
    } catch (err: any) {
      console.error('Impersonation failed:', err);
      throw err;
    }
  }

  function exitImpersonation() {
    localStorage.removeItem('sentra_original_user');
    localStorage.removeItem('sentra_impersonation_token');
    localStorage.removeItem('sentra_impersonated_user');

    if (originalUser) {
      setUser(originalUser);
      const storedToken = localStorage.getItem('sentra_access_token');
      setAccessToken(storedToken);
      setOriginalUser(null);
    }
    window.location.href = '/app';
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
