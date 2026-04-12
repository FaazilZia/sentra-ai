import {
  LayoutDashboard,
  Box,
  Activity,
  ShieldAlert,
  History,
  FileSignature,
  Presentation,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Link } from 'react-router-dom';
import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Overview', href: '/app', icon: LayoutDashboard },
  { name: 'Connect', href: '/app/connect', icon: Zap },
  { name: 'Security Feed', href: '/app/security', icon: Radio },
  { name: 'Inventory', href: '/app/inventory', icon: Box },
  { name: 'Observability', href: '/app/observability', icon: Activity },
  { name: 'Risk Center', href: '/app/risk', icon: ShieldAlert },
  { name: 'Audit Proof', href: '/app/audit', icon: History },
  { name: 'Governance', href: '/app/governance', icon: FileSignature },
  { name: 'Privacy & Consent', href: '/app/privacy', icon: ShieldCheck },
  { name: 'Board Review', href: '/app/board-review', icon: Presentation },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        'relative z-20 hidden h-full flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 shadow-xl transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="p-8 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] group-hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all">
            <span className="font-black text-xl italic">S</span>
          </div>
          <span className={cn(
            "text-xl font-black text-white tracking-tighter group-hover:text-blue-400 transition-colors",
            collapsed && "hidden"
          )}>
            SENTRA AI
          </span>
        </Link>
      </div>

      <nav className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {!collapsed ? (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Main Menu
          </p>
        ) : null}
        {navigation.map((item) => (
          <SidebarItem
            key={item.name}
            name={item.name}
            href={item.href}
            icon={item.icon}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300">
            <User className="w-4 h-4" />
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white">
                {user?.full_name ?? 'Signed In User'}
              </p>
                <p className="truncate text-[11px] text-slate-500">{user?.email ?? 'No email loaded'}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 bottom-24 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
