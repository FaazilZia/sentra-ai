import { Search, Bell, Download, Plus, ChevronRight } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';

export function Header() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <header className="fixed top-0 right-0 z-40 h-[var(--topbar-height)] w-full lg:w-[calc(100%-var(--sidebar-width))] bg-[var(--bg-topbar)] border-b border-[var(--border-default)] px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[var(--text-xs)] font-medium text-[var(--text-secondary)]">
          <Link to="/app" className="hover:text-[var(--royal-indigo)] transition-colors">Governance Workspace</Link>
          {pathnames.map((name, index) => {
            const isLast = index === pathnames.length - 1;
            const label = name.replace('-', ' ');
            
            return (
              <div key={name} className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
                <span className={isLast ? "text-[var(--text-primary)] font-bold" : ""}>
                  {label}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-5">
        {/* Search Bar */}
        <div className="relative hidden xl:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search policies, risks, audits..." 
            className="w-80 bg-[var(--bg-page)] border border-[var(--border-default)] rounded py-1.5 pl-9 pr-4 text-[var(--text-xs)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--violet-blue)] transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pl-5 border-l border-[var(--border-default)]">
          <button 
            onClick={() => useStore.getState().addToast({ message: 'NO NEW NOTIFICATIONS', type: 'info' })}
            className="p-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all relative"
          >
            <Bell className="h-4 w-4" />
          </button>
          
          <button 
            className="btn-secondary h-8 flex items-center gap-2 !px-3 !py-0 !text-[10px] uppercase tracking-widest"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </button>

          <button 
            onClick={() => useStore.getState().openModal('ADD_FRAMEWORK')}
            className="btn-primary h-8 flex items-center gap-2 !px-4 !py-0 !text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--royal-indigo)]/10"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Case</span>
          </button>
        </div>
      </div>
    </header>
  );
}
