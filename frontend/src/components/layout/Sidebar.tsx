import {
  LayoutDashboard,
  ShieldAlert,
  Database,
  FileText,
  Zap,
  Activity,
  FileSignature,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Risk', href: '/app/risk', icon: ShieldAlert },
  { name: 'Models', href: '/app/inventory', icon: Database },
  { name: 'Audit', href: '/app/audit', icon: FileText },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'relative z-20 flex h-full flex-shrink-0 flex-col border-r border-[var(--card-border)] bg-[var(--sidebar)] text-[var(--foreground)] shadow-2xl transition-all duration-300 ease-out',
        collapsed ? 'w-20' : 'w-24'
      )}
    >
      <div className="flex h-20 items-center justify-center border-b border-[var(--card-border)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/20">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-8 py-10">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              role="button"
              aria-label={`Navigate to ${item.name}`}
              className={cn(
                "group flex flex-col items-center gap-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-2xl",
                isActive ? "opacity-100" : "opacity-40 hover:opacity-70"
              )}
            >
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110",
                isActive ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
              )}>
                <item.icon className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.2em]",
                isActive ? "text-cyan-400" : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4 flex flex-col items-center gap-6">
        <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 p-0.5 overflow-hidden">
           <img src={`https://ui-avatars.com/api/?name=${user?.fullName || 'User'}&background=0ea5e9&color=fff`} className="h-full w-full rounded-full" />
        </div>
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="text-slate-600 hover:text-cyan-400 transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
