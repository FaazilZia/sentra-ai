import {
  LayoutDashboard,
  Activity,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Gavel,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Overview', href: '/app', icon: LayoutDashboard },
  { name: 'AI Activity Logs', href: '/app/activity-logs', icon: Activity },
  { name: 'Compliance', href: '/app/compliance', icon: Gavel },
  { name: 'Policies', href: '/app/governance', icon: ShieldCheck },
  { name: 'Audit Proof', href: '/app/audit-proof', icon: FileText },
  { name: 'Alerts / Overrides', href: '/app/security', icon: Radio },
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
      <div className="border-b border-slate-800 px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg">
            <span className="text-xl font-bold tracking-tighter italic">S</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-lg font-bold tracking-tight text-white">Sentra AI</span>
              <span className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Compliance OS</span>
            </div>
          )}
        </div>
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
