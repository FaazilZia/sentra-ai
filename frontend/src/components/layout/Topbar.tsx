import { Search, ShieldCheck, ExternalLink } from 'lucide-react';

export function Topbar() {
  return (
    <header className="h-16 border-b border-white/10 bg-slate-950/35 z-10 sticky top-0 flex-shrink-0 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        
        {/* Center/Left Search */}
        <div className="flex items-center flex-1">
          <div className="relative w-full max-w-lg hidden md:flex items-center">
            <Search className="absolute left-3 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search policies, agents, or compliance logs..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300/25 focus:border-cyan-200/25 transition-all placeholder:text-slate-500 text-slate-100 backdrop-blur-md"
            />
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-4">
          
          {/* System Health Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-emerald-400/10 border border-emerald-300/15 px-3 py-1.5 rounded-full backdrop-blur-md">
            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-inner shadow-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-emerald-200 uppercase">System Health: Optimal</span>
          </div>
          
          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
          
          {/* Executive Dashboard Toggle Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-300/12 border border-cyan-200/15 text-cyan-50 rounded-xl text-sm font-medium hover:bg-cyan-300/18 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-cyan-950/25 active:scale-95 shadow-sm group backdrop-blur-md">
            <span>Executive Dashboard</span>
            <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
          
        </div>
      </div>
    </header>
  );
}
