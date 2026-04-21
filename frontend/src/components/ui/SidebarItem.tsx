import { NavLink, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  collapsed?: boolean;
}

export function SidebarItem({ name, href, icon: Icon, collapsed = false }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink
      to={href}
      className={cn(
        "group flex items-center rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-200",
        collapsed && "justify-center px-2",
        isActive
          ? "bg-white text-slate-950"
          : "text-slate-500 hover:bg-slate-900 hover:text-white"
      )}
      title={collapsed ? name : undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4 flex-shrink-0 transition-all duration-200",
          !collapsed && "mr-3",
          isActive ? "text-slate-950" : "group-hover:text-white"
        )}
        aria-hidden="true"
      />
      {!collapsed ? name : <span className="sr-only">{name}</span>}
    </NavLink>
  );
}
