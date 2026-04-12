import { NavLink, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

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
        "group flex items-center rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
        collapsed && "justify-center px-2",
        isActive
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
      )}
      title={collapsed ? name : undefined}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
          !collapsed && "mr-3",
          isActive ? "text-white" : "group-hover:text-slate-100"
        )}
        aria-hidden="true"
      />
      {!collapsed ? name : <span className="sr-only">{name}</span>}
    </NavLink>
  );
}
