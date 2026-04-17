import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, RefreshCw, Search, ShieldCheck, ShieldX, Moon, Sun, Home } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { apiBaseUrl } from '../../lib/api';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../lib/useTheme';

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [status, setStatus] = useState<'online' | 'degraded' | 'checking'>('online');

  const pathParts = location.pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-10 h-16 flex-shrink-0 premium-glass !rounded-none !border-t-0 !border-x-0 bg-[var(--background)]/40 backdrop-blur-3xl shadow-sm transition-colors duration-300">
      <div className="noise-overlay" />
      <div className="relative z-10 flex h-full items-center justify-between gap-3 px-8">
        {/* Breadcrumb - Image 3 Style */}
        <div className="flex items-center gap-3">
           <div className="h-6 w-6 rounded-full bg-[var(--card)] flex items-center justify-center border border-[var(--card-border)]">
              <div className="h-2 w-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]" />
           </div>
           <nav className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em]">
             <span className="text-[var(--muted)]">sentra.live</span>
             <span className="text-[var(--card-border)] opacity-20">/</span>
             <span className="text-[var(--foreground)]">{pathParts[0] || 'dashboard'}</span>
           </nav>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 rounded-full bg-[var(--card)] px-4 py-1.5 border border-[var(--card-border)] shadow-inner">
             <div className="relative h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-40" />
                <div className="h-full w-full rounded-full bg-emerald-500" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Systems Secure</span>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-6">
             <Link 
               to="/"
               className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1.5"
               title="Back to Landing Page"
             >
                <Home className="h-5 w-5" />
             </Link>
             <button 
               onClick={toggleTheme}
               className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1.5"
               title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
             >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
             </button>
             <button className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1.5">
                <Search className="h-5 w-5" />
             </button>
             <div className="flex items-center gap-3">
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-[var(--foreground)] leading-none whitespace-nowrap">{user?.fullName || 'Operator 01'}</p>
                   <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest mt-1">Admin Session</p>
                </div>
                <button onClick={logout} className="h-8 w-8 rounded-full bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center hover:bg-[var(--foreground)]/5 transition-all">
                   <LogOut className="h-3.5 w-3.5 text-[var(--muted)]" />
                </button>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}
