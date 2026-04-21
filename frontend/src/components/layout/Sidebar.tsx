import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  FileText,
  ShieldCheck,
  TriangleAlert,
  FileCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '@/lib/utils';

type NavigationItem = {
  name: string;
  href: string;
  icon: any;
  indicator?: 'dot' | 'badge';
  indicatorValue?: number;
};

type NavigationGroup = {
  group: string;
  items: NavigationItem[];
};

// Categorized Story Flow Navigation
const navigationGroups: NavigationGroup[] = [
  {
    group: 'MONITOR',
    items: [
      { name: 'Overview', href: '/app', icon: LayoutDashboard },
      { name: 'Live Monitoring', href: '/app/observability', icon: Activity, indicator: 'dot' as const },
    ]
  },
  {
    group: 'INVESTIGATE',
    items: [
      { name: 'Violations', href: '/app/activity-logs', icon: ShieldAlert, indicator: 'badge' as const, indicatorValue: 14 },
      { name: 'Audit Logs', href: '/app/audit', icon: FileText },
    ]
  },
  {
    group: 'FIX',
    items: [
      { name: 'Policies & Rules', href: '/app/governance', icon: ShieldCheck },
      { name: 'Risk Assessments', href: '/app/risk', icon: TriangleAlert },
    ]
  },
  {
    group: 'PROVE',
    items: [
      { name: 'Compliance Reports', href: '/app/inventory', icon: FileCheck },
    ]
  }
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar(_props: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        'relative z-20 hidden h-full flex-shrink-0 flex-col border-r border-white/5 bg-slate-950 text-slate-100 transition-[width] duration-300 ease-out md:flex w-64'
      )}
    >
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 shadow-[0_0_15px_rgba(244,63,94,0.4)] text-white">
            <span className="text-lg font-black italic">S</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-black tracking-tight text-white uppercase">Sentra AI</span>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 custom-scrollbar mt-4">
        {navigationGroups.map((group) => (
          <div key={group.group} className="flex flex-col gap-1">
            <h4 className="px-2 mb-1 text-[10px] font-black tracking-widest text-slate-300 uppercase">
              {group.group}
            </h4>
            {group.items.map((item) => (
              <SidebarItem
                key={item.name}
                name={item.name}
                href={item.href}
                icon={item.icon}
                collapsed={false}
                indicator={item.indicator}
                indicatorValue={item.indicatorValue}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-white/5 rounded-xl transition-colors">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-white/5 text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-slate-100 uppercase tracking-tighter">
              {user?.full_name ?? 'Admin User'}
            </p>
            <p className="truncate text-[9px] text-slate-300 font-medium">{user?.email ?? 'Settings & Profile'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
