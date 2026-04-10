import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, Search, Server, ShieldCheck, ShieldX } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { apiBaseUrl } from '../../lib/api';

export function Topbar() {
  const { user, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>(
    apiBaseUrl ? 'checking' : 'idle'
  );

  useEffect(() => {
    if (!apiBaseUrl) {
      setBackendStatus('idle');
      return;
    }

    const controller = new AbortController();

    async function checkBackend(): Promise<void> {
      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        setBackendStatus(response.ok ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    }

    void checkBackend();
    return () => controller.abort();
  }, []);

  const online = backendStatus === 'online';

  return (
    <header className="sticky top-0 z-10 h-16 flex-shrink-0 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-4 px-5 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative hidden w-full max-w-xl md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search policies, agents, files, users..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm sm:flex">
            <span className="relative flex h-2 w-2">
              {online ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
              ) : null}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  online ? 'bg-emerald-500' : backendStatus === 'offline' ? 'bg-rose-600' : 'bg-amber-500'
                }`}
              />
            </span>
            <span>{online ? 'All Systems Nominal' : backendStatus === 'offline' ? 'System Degraded' : 'Checking'}</span>
            {online ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : backendStatus === 'offline' ? <ShieldX className="h-3.5 w-3.5 text-rose-600" /> : <Server className="h-3.5 w-3.5 text-amber-600" />}
          </div>

          <button className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 md:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
              {user?.full_name?.slice(0, 1) ?? 'S'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">Sentra AI Org</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email ?? 'No user loaded'}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
