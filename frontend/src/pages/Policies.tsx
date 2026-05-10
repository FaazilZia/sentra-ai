import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const policies: any[] = [];

export default function Policies() {
  const addToast = useStore((state) => state.addToast);

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Governance Policies</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Organizational Guardrails & Compliance Standards
          </p>
        </div>
        <button 
          onClick={() => addToast({ message: 'Policy creation wizard initializing...', type: 'info' })}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create Policy
        </button>
      </div>

      <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 border-r border-[var(--border-default)] pr-6">
            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Total</span>
            <span className="text-[var(--text-md)] font-black text-[var(--text-primary)]">{(policies || []).length}</span>
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--border-default)] pr-6">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Active</span>
             <span className="text-[var(--text-md)] font-black text-[var(--text-primary)]">{(policies || []).filter(p => p.status === 'Active').length}</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-amber-500" />
             <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Draft</span>
             <span className="text-[var(--text-md)] font-black text-[var(--text-primary)]">{(policies || []).filter(p => p.status === 'Draft').length}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search policies..." className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold text-[var(--text-primary)] w-64 focus:outline-none" />
          </div>
          <button className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {(policies || []).map((policy) => (
          <div 
            key={policy.id} 
            onClick={() => addToast({ message: `Opening ${policy.title} for review...`, type: 'info' })}
            className="card-base p-6 group hover:border-[var(--royal-indigo)] transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="h-10 w-10 rounded-lg bg-[var(--bg-page)] flex items-center justify-center text-[var(--royal-indigo)]">
                <FileText className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1",
                policy.status === 'Active' ? "bg-emerald-500/10 text-emerald-400" :
                policy.status === 'Draft' ? "bg-amber-500/10 text-amber-400" :
                "bg-slate-500/10 text-slate-500"
              )}>
                {policy.status === 'Active' && <CheckCircle2 className="h-2.5 w-2.5" />}
                {policy.status === 'Draft' && <Clock className="h-2.5 w-2.5" />}
                {policy.status === 'Archived' && <Archive className="h-2.5 w-2.5" />}
                {policy.status}
              </span>
            </div>
            
            <h3 className="text-[var(--text-md)] font-black text-[var(--text-primary)] uppercase tracking-tight mb-2 group-hover:text-[var(--royal-indigo)] transition-colors">
              {policy.title}
            </h3>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{policy.version}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-default)]" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{policy.category}</span>
            </div>
            
            <div className="pt-6 border-t border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center">
                  <User className="h-3 w-3 text-[var(--text-muted)]" />
                </div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">{policy.owner}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Calendar className="h-3 w-3" />
                <span className="text-[9px] font-bold">{policy.lastUpdated}</span>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
              <ArrowRight className="h-4 w-4 text-[var(--royal-indigo)]" />
            </div>
          </div>
        ))}

        {/* Create Placeholder */}
        <div className="border-2 border-dashed border-[var(--border-default)] rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-white/5 transition-all cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">New Policy Document</p>
        </div>
      </div>
    </div>
  );
}
