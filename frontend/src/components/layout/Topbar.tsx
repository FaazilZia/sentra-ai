import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, RefreshCw, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fetchBackendHealth } from '../../lib/api';

export function Topbar() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<'checking' | 'waking' | 'online' | 'degraded'>('checking');

  useEffect(() => {
    let attempts = 0;
    const checkBackend = async () => {
      try {
        const response = await fetchBackendHealth();
        if (response.status === 'healthy') {
          setStatus('online');
          return true;
        }
      } catch (e) {
        // Silent fail, retry
      }
      return false;
    };

    const runCheck = async () => {
      const isOnline = await checkBackend();
      if (isOnline) return;

      // Enter waking state if first check fails
      setStatus('waking');
      
      const interval = setInterval(async () => {
        attempts++;
        const success = await checkBackend();
        if (success) {
          clearInterval(interval);
        } else if (attempts > 5) { // ~30 seconds of total checking
          setStatus('degraded');
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    };

    runCheck();
  }, []);

  const online = status === 'online';
  const waking = status === 'waking' || status === 'checking';

  return (
    <header className="sticky top-0 z-10 h-16 flex-shrink-0 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:px-5">
        <div className="flex min-w-0 flex-1 items-center">
          <div className="relative hidden w-full min-w-0 max-w-md md:block xl:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search policies, agents, files, users..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
            />
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 lg:gap-3">
          <div className="hidden items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-sm lg:flex">
            <span className="relative flex h-2 w-2">
              {(online || waking) && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  online ? 'bg-emerald-500' : status === 'degraded' ? 'bg-rose-600' : 'bg-amber-500'
                }`}
              />
            </span>
            <span>
              {online ? 'All Systems Nominal' : status === 'degraded' ? 'System Degraded' : 'Waking Backend...'}
            </span>
            {online ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            ) : status === 'degraded' ? (
              <ShieldX className="h-3.5 w-3.5 text-rose-600" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" />
            )}
          </div>

          <button className="hidden max-w-[220px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 xl:flex">
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
