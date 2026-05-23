import { useEffect, useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  LoaderCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { fetchPolicies, PolicyResponse } from '@/lib/api';
import { EvidenceSection } from '../components/shared/EvidenceSection';
import { ChangeHistoryTimeline } from '../components/shared/ChangeHistoryTimeline';


export default function Policies() {
  const addToast = useStore((state) => state.addToast);
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyResponse | null>(null);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const data = await fetchPolicies();
        setPolicies(data);
      } catch (error) {
        console.error('Failed to fetch policies:', error);
        addToast({ message: 'Failed to load policies from governance engine', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    loadPolicies();
  }, [addToast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoaderCircle className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Querying Ledger...</span>
      </div>
    );
  }

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
            <span className="text-[var(--text-md)] font-black text-[var(--text-primary)]">{policies.length}</span>
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--border-default)] pr-6">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Enabled</span>
             <span className="text-[var(--text-md)] font-black text-[var(--text-primary)]">{policies.filter(p => p.enabled).length}</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-amber-500" />
             <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Draft</span>
             <span className="text-[var(--text-md)] font-black text-[var(--text-primary)]">{policies.filter(p => p.status === 'draft').length}</span>
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
        {policies.map((policy) => (
          <div 
            key={policy.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedPolicy(policy)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPolicy(policy); } }}
            className="card-base p-6 group hover:border-[var(--royal-indigo)] transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="h-10 w-10 rounded-lg bg-[var(--bg-page)] flex items-center justify-center text-[var(--royal-indigo)]">
                <FileText className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1",
                policy.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
              )}>
                {policy.enabled ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                {policy.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <h3 className="text-[var(--text-md)] font-black text-[var(--text-primary)] uppercase tracking-tight mb-2 group-hover:text-[var(--royal-indigo)] transition-colors">
              {policy.name}
            </h3>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">v{policy.current_version || 1}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-default)]" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{policy.effect}</span>
            </div>
            
            <p className="text-[var(--text-xs)] text-[var(--text-secondary)] line-clamp-2 mb-6 min-h-[32px]">
              {policy.description || 'No description provided.'}
            </p>
            
            <div className="pt-6 border-t border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center">
                  <User className="h-3 w-3 text-[var(--text-muted)]" />
                </div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">Governance Admin</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Calendar className="h-3 w-3" />
                <span className="text-[9px] font-bold">{new Date(policy.created_at || '').toLocaleDateString()}</span>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
              <ArrowRight className="h-4 w-4 text-[var(--royal-indigo)]" />
            </div>
          </div>
        ))}

        {/* Create Placeholder */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => addToast({ message: 'Policy creation wizard initializing...', type: 'info' })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToast({ message: 'Policy creation wizard initializing...', type: 'info' }); } }}
          className="border-2 border-dashed border-[var(--border-default)] rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-white/5 transition-all cursor-pointer group"
        >
          <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">New Policy Document</p>
        </div>
      </div>

      {selectedPolicy && (
        <div className="fixed inset-y-0 right-0 z-50 w-[440px] bg-white border-l border-[var(--border-default)] shadow-2xl p-6 flex flex-col justify-between animate-fade-in text-left">
          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-[var(--royal-indigo)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Policy details</span>
              </div>
              <button 
                onClick={() => setSelectedPolicy(null)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] transition-all outline-none"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-[13px] font-black uppercase tracking-tight text-[var(--text-primary)]">{selectedPolicy.name}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <span>v{selectedPolicy.current_version || 1}</span>
                <span>•</span>
                <span>{selectedPolicy.effect}</span>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Description</h4>
              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">{selectedPolicy.description || 'No description provided.'}</p>
            </div>

            {/* Evidence Sub-section */}
            <div className="pt-4 border-t border-[var(--border-default)]/60">
              <EvidenceSection entityType="policy" entityId={selectedPolicy.id} />
            </div>

            {/* Change History Sub-section */}
            <div className="pt-4 border-t border-[var(--border-default)]/60">
              <ChangeHistoryTimeline entityType="policy" entityId={selectedPolicy.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

