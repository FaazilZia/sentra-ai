import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Database,
  FileText,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '@/lib/utils';

// Vanta-style Navigation
const navigation = [
  { name: 'Overview', href: '/app', icon: LayoutDashboard },
  { name: 'Live Monitoring', href: '/app/observability', icon: Activity, indicator: 'dot' as const },
  { name: 'Violations', href: '/app/activity-logs', icon: ShieldAlert, indicator: 'badge' as const, indicatorValue: 14 },
  { name: 'Policies & Rules', href: '/app/governance', icon: ShieldCheck },
  { name: 'Risk Assessments', href: '/app/risk', icon: TriangleAlert },
  { name: 'Model Inventory', href: '/app/inventory', icon: Database },
  { name: 'Audit Logs', href: '/app/audit', icon: FileText },
  { name: 'User Access', href: '/app/privacy', icon: Users },
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
        'relative z-20 hidden h-full flex-shrink-0 flex-col border-r border-white/5 bg-slate-950 text-slate-400 transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg text-white">
            <span className="text-lg font-black italic">S</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-black tracking-tight text-white uppercase">Sentra AI</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 custom-scrollbar mt-4">
        {navigation.map((item) => (
          <SidebarItem
            key={item.name}
            name={item.name}
            href={item.href}
            icon={item.icon}
            collapsed={collapsed}
            indicator={item.indicator}
            indicatorValue={item.indicatorValue}
          />
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-white/5 rounded-xl transition-colors">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-white/5 text-slate-500">
            <User className="w-4 h-4" />
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-white uppercase tracking-tighter">
                {user?.full_name ?? 'Admin User'}
              </p>
              <p className="truncate text-[9px] text-slate-500 font-medium">{user?.email ?? 'Settings & Profile'}</p>
            </div>
          ) : null}
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-slate-400 hover:text-white transition-all shadow-lg"
      >
        {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
      </button>
    </aside>
  );
}
