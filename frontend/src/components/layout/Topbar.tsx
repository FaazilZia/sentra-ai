import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, Search, Calendar, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export function Topbar() {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-10 h-20 flex-shrink-0 border-b border-white/5 bg-[#0a0f1a]/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-3 px-6 lg:px-8">
        
        {/* Left Side: Title & Subtitle */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight">AI Compliance Overview</h1>
          <p className="text-xs text-slate-400 font-medium">Monitor and manage AI workflow risks</p>
        </div>

        {/* Right Side: Filters, Search, Profile */}
        <div className="flex flex-shrink-0 items-center gap-4 lg:gap-6">
          
          {/* Global Search */}
          <div className="relative hidden w-64 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search policies..."
              className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-slate-200 outline-none transition focus:border-cyan-500/50 focus:bg-white/10 focus:ring-1 focus:ring-cyan-500/50 placeholder:text-slate-400"
            />
          </div>

          {/* Date Filter */}
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10 hover:text-white">
            <Calendar className="h-4 w-4 text-slate-300" />
            Last 7 Days
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {/* Notifications */}
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-slate-950" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 pl-2 transition hover:opacity-80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg ring-2 ring-white/10">
                {user?.fullName?.slice(0, 2).toUpperCase() ?? 'SA'}
              </div>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isDropdownOpen && "rotate-180")} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0d1424] p-2 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="px-3 py-2 mb-2 border-b border-white/5">
                  <p className="text-[11px] font-bold text-white uppercase tracking-tighter truncate">{user?.fullName ?? 'Admin'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                  <User className="h-3.5 w-3.5" />
                  Profile
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </button>
                <div className="my-1 border-t border-white/5" />
                <button 
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Add cn utility if not imported
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
