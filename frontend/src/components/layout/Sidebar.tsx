import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  FileText,
  ShieldCheck,
  TriangleAlert,
  FileCheck,
  User,
  Database,
  Key,
  BellRing,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { SidebarItem } from '../ui/SidebarItem';
import { cn } from '@/lib/utils';
import { fetchViolations } from '@/lib/api';

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

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const [violationCount, setViolationCount] = useState(0);

  useEffect(() => {
    const getCount = async () => {
      try {
        const violations = await fetchViolations();
        setViolationCount(violations.length);
      } catch (e) {
        console.error('Failed to fetch violation count', e);
      }
    };
    getCount();
    const interval = setInterval(getCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigationGroups: NavigationGroup[] = [
    {
      group: 'MONITOR',
      items: [
        { name: 'Overview', href: '/app', icon: LayoutDashboard },
      ]
    },
    {
      group: 'INVESTIGATE',
      items: [
        { name: 'Violations', href: '/app/violations', icon: ShieldAlert, indicator: 'badge' as const, indicatorValue: violationCount },
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
    },
    {
      group: 'INFRASTRUCTURE',
      items: [
        { name: 'Data Connectors', href: '/app/connect', icon: Database },
      ]
    },
    {
      group: 'SETTINGS',
      items: [
        { name: 'API Keys', href: '/app/settings/api-keys', icon: Key },
        { name: 'Alert Settings', href: '/app/settings/alerts', icon: BellRing },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full flex-shrink-0 flex-col border-r border-white/5 bg-[#0a0f1a] text-slate-100 transition-transform duration-300 ease-out md:relative md:translate-x-0 md:flex w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="px-6 py-8">
          <Link to="/app" className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={onClose}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 shadow-[0_0_15px_rgba(244,63,94,0.4)] text-white">
              <span className="text-lg font-black italic">S</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-black tracking-tight text-white uppercase">Sentra AI</span>
            </div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 custom-scrollbar mt-4">
          {navigationGroups.map((group) => (
            <div key={group.group} className="flex flex-col gap-1">
              <h4 className="px-2 mb-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
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
                  onClick={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto bg-[#0d1424]">
          <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-white/5 rounded-xl transition-colors">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-white/5 text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-slate-100 uppercase tracking-tighter">
                {user?.fullName ?? 'Admin User'}
              </p>
              <p className="truncate text-[9px] text-slate-400 font-medium">{user?.email ?? 'Settings & Profile'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

interface SidebarProps {
  collapsed?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}
