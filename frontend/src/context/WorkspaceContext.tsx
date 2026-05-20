import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthContext } from './AuthContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
  description?: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  switchWorkspace: () => {},
  refreshWorkspaces: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/tenant/workspaces', { credentials: 'include' });
      if (res.ok) {
        const { data } = await res.json();
        setWorkspaces(data || []);
        // Set default workspace if not already selected
        if (!currentWorkspace && data?.length > 0) {
          const defaultWs = data.find((w: Workspace) => w.is_default) || data[0];
          setCurrentWorkspace(defaultWs);
        }
      }
    } catch (_) { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => { fetchWorkspaces(); }, []);

  const switchWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    // Persist to localStorage for page refreshes
    localStorage.setItem('sentra:workspace', workspace.id);
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      isLoading,
      switchWorkspace,
      refreshWorkspaces: fetchWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
