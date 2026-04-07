import { useEffect, useState } from 'react';
import { LoaderCircle, Search, Server, ShieldCheck, ShieldX, ExternalLink } from 'lucide-react';

export function Topbar() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
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
  }, [apiBaseUrl]);

  const statusConfig =
    backendStatus === 'online'
      ? {
          container: 'bg-emerald-400/10 border-emerald-300/15',
          iconShell: 'bg-white/10 border-white/10',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />,
          label: 'Backend: Online',
          text: 'text-emerald-200',
        }
      : backendStatus === 'checking'
        ? {
            container: 'bg-cyan-300/10 border-cyan-200/15',
            iconShell: 'bg-white/10 border-white/10',
            icon: <LoaderCircle className="w-3.5 h-3.5 text-cyan-200 animate-spin" />,
            label: 'Backend: Checking',
            text: 'text-cyan-100',
          }
        : backendStatus === 'offline'
          ? {
              container: 'bg-rose-400/10 border-rose-300/15',
              iconShell: 'bg-white/10 border-white/10',
              icon: <ShieldX className="w-3.5 h-3.5 text-rose-300" />,
              label: 'Backend: Offline',
              text: 'text-rose-200',
            }
          : {
              container: 'bg-white/5 border-white/10',
              iconShell: 'bg-white/10 border-white/10',
              icon: <Server className="w-3.5 h-3.5 text-slate-300" />,
              label: 'Backend: Not Set',
              text: 'text-slate-200',
            };

  return (
    <header className="h-16 border-b border-white/10 bg-slate-950/35 z-10 sticky top-0 flex-shrink-0 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        
        {/* Center/Left Search */}
        <div className="flex items-center flex-1">
          <div className="relative w-full max-w-lg hidden md:flex items-center">
            <Search className="absolute left-3 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search policies, agents, or compliance logs..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300/25 focus:border-cyan-200/25 transition-all placeholder:text-slate-500 text-slate-100 backdrop-blur-md"
            />
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-4">
          
          {/* System Health Pill */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${statusConfig.container}`}>
            <div className={`w-6 h-6 rounded-full backdrop-blur-md flex items-center justify-center shadow-inner shadow-white/10 border ${statusConfig.iconShell}`}>
              {statusConfig.icon}
            </div>
            <span className={`text-xs font-semibold tracking-wide uppercase ${statusConfig.text}`}>{statusConfig.label}</span>
          </div>
          
          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
          
          {/* Executive Dashboard Toggle Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-300/12 border border-cyan-200/15 text-cyan-50 rounded-xl text-sm font-medium hover:bg-cyan-300/18 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-cyan-950/25 active:scale-95 shadow-sm group backdrop-blur-md">
            <span>Executive Dashboard</span>
            <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
          
        </div>
      </div>
    </header>
  );
}
