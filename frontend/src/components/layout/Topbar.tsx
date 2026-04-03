import React from 'react';
import { Search, ShieldCheck, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Topbar() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white z-10 sticky top-0 flex-shrink-0 shadow-sm">
      <div className="flex h-full items-center justify-between px-6">
        
        {/* Center/Left Search */}
        <div className="flex items-center flex-1">
          <div className="relative w-full max-w-lg hidden md:flex items-center">
            <Search className="absolute left-3 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search policies, agents, or compliance logs..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all placeholder:text-slate-400 text-slate-900"
            />
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-4">
          
          {/* System Health Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span className="text-xs font-semibold tracking-wide text-success uppercase">System Health: Optimal</span>
          </div>
          
          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
          
          {/* Executive Dashboard Toggle Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all duration-300 ease-in-out hover:shadow-md hover:scale-105 active:scale-95 shadow-sm group">
            <span>Executive Dashboard</span>
            <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
          
        </div>
      </div>
    </header>
  );
}
