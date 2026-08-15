import { useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  ShieldCheck,
  ClipboardCheck,
  ShieldAlert,
  Activity,
  FolderOpen,
  Sparkles,
  Settings2,
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface SidebarNavItem {
  icon: any;
  label: string;
  path: string;
  badge?: string;
}

const PRIMARY_NAV_ITEMS: SidebarNavItem[] = [
  { icon: LayoutDashboard, label: 'Overview', path: '/app' },
  { icon: Bot, label: 'Agents', path: '/app/agents' },
  { icon: ShieldCheck, label: 'Policies & Guardrails', path: '/app/policies' },
  { icon: ClipboardCheck, label: 'Compliance', path: '/app/compliance' },
  { icon: ShieldAlert, label: 'Risk', path: '/app/risk' },
  { icon: Activity, label: 'Activity', path: '/app/activity' },
  { icon: FolderOpen, label: 'Evidence & Reports', path: '/app/evidence' },
  { icon: Sparkles, label: 'AI Advisor', path: '/app/advisor' },
  { icon: Settings2, label: 'Settings', path: '/app/settings' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : 'SA';

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-[#1e293b] border border-white/10 text-white hover:bg-[#334155] focus:outline-none transition-colors shadow-lg"
        aria-label="Open sidebar menu"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setIsOpen(false))}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          className="lg:hidden fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Sidebar navigation drawer */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[var(--sidebar-width)] bg-[#0f172a] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-[var(--topbar-height)] items-center justify-between px-4 border-b border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <svg viewBox="60 5 110 125" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
                <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="152" y1="30" x2="132" y2="18"/>
                  <line x1="132" y1="18" x2="104" y2="13"/>
                  <line x1="104" y1="13" x2="78" y2="30"/>
                  <line x1="78" y1="30" x2="74" y2="58"/>
                  <line x1="74" y1="58" x2="108" y2="66"/>
                  <line x1="108" y1="66" x2="128" y2="47"/>
                  <line x1="108" y1="66" x2="95" y2="86"/>
                  <line x1="108" y1="66" x2="150" y2="73"/>
                  <line x1="150" y1="73" x2="146" y2="104"/>
                  <line x1="146" y1="104" x2="163" y2="99"/>
                  <line x1="146" y1="104" x2="162" y2="119"/>
                  <line x1="146" y1="104" x2="119" y2="121"/>
                  <line x1="119" y1="121" x2="90" y2="112"/>
                  <line x1="90" y1="112" x2="66" y2="104"/>
                </g>
                <g fill="currentColor">
                  <circle cx="152" cy="30" r="3"/>
                  <circle cx="132" cy="18" r="10"/>
                  <circle cx="104" cy="13" r="6"/>
                  <circle cx="78" cy="30" r="9"/>
                  <circle cx="74" cy="58" r="7"/>
                  <circle cx="128" cy="47" r="3"/>
                  <circle cx="95" cy="86" r="3"/>
                  <circle cx="150" cy="73" r="7"/>
                  <circle cx="146" cy="104" r="10"/>
                  <circle cx="163" cy="99" r="3"/>
                  <circle cx="162" cy="119" r="3"/>
                  <circle cx="119" cy="121" r="6"/>
                  <circle cx="90" cy="112" r="10"/>
                  <circle cx="66" cy="104" r="3"/>
                </g>
                <circle cx="108" cy="66" r="11" fill="none" stroke="currentColor" strokeWidth="7"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-black uppercase tracking-wider text-white block whitespace-nowrap truncate">Sentraa AI</span>
              <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-tight block -mt-0.5 whitespace-nowrap truncate">Governance OS</span>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 9-Section Navigation */}
        <nav className="flex-1 space-y-1 px-3 pt-5 overflow-y-auto custom-scrollbar pb-6">
          <div className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Core Operations
          </div>

          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = item.path === '/app' 
              ? pathname === '/app'
              : pathname.startsWith(item.path);

            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/app'}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all duration-200 text-xs font-bold uppercase tracking-wider",
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-indigo-400"
                  )} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={cn(
                  "h-3 w-3 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                )} />
              </NavLink>
            );
          })}

          {user?.role === 'SUPER_ADMIN' && (
            <div className="pt-4 border-t border-slate-800 mt-4">
              <NavLink
                to="/superadmin"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  "group flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all duration-200 text-xs font-bold uppercase tracking-wider",
                  isActive ? "bg-amber-600 text-white" : "text-amber-400 hover:bg-amber-500/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span>Platform Console</span>
                </div>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Footer User Profile */}
        <div className="p-3.5 border-t border-slate-800 bg-[#090d16]">
          <div
            role="button"
            tabIndex={0}
            onClick={handleLogout}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLogout()}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-600 border border-indigo-400/30 flex items-center justify-center text-[10px] font-black text-white">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white uppercase tracking-tight truncate">
                {user?.fullName || 'Governance Admin'}
              </p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase truncate">
                {user?.role || 'Admin'}
              </p>
            </div>
            <LogOut className="h-3.5 w-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
          </div>
        </div>
      </aside>
    </>
  );
}
