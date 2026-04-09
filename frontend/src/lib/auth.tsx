import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AuthUser, fetchCurrentUser, loginRequest } from './api';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  loginPending: boolean;
  loginError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const storageKey = 'sentra-auth-session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const rawSession = window.localStorage.getItem(storageKey);
    if (!rawSession) {
      setLoading(false);
      return;
    }

    const storedTokens = JSON.parse(rawSession) as StoredTokens;

    async function restoreSession() {
      try {
        const currentUser = await fetchCurrentUser(storedTokens.accessToken);
        setAccessToken(storedTokens.accessToken);
        setUser(currentUser);
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, []);

  async function login(email: string, password: string) {
    setLoginPending(true);
    setLoginError(null);

    try {
      const tokens = await loginRequest(email, password);
      const currentUser = await fetchCurrentUser(tokens.access_token);

      setAccessToken(tokens.access_token);
      setUser(currentUser);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        } satisfies StoredTokens)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      setLoginError(message);
      throw error;
    } finally {
      setLoginPending(false);
    }
  }

  function logout() {
    setAccessToken(null);
    setUser(null);
    setLoginError(null);
    window.localStorage.removeItem(storageKey);
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
