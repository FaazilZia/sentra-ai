import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
}

export function SidebarItem({ name, href, icon: Icon }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink
      to={href}
      className={cn(
        "group flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-in-out",
        isActive
          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 elevate-sm"
          : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent hover:border-slate-200/50"
      )}
    >
      <Icon
        className={cn(
          "mr-3 flex-shrink-0 h-[18px] w-[18px] transition-all duration-300 ease-in-out",
          isActive ? "text-white" : "group-hover:scale-110 group-hover:text-slate-900"
        )}
        aria-hidden="true"
      />
      {name}
    </NavLink>
  );
}
