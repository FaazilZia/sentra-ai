import { 
  Search, 
  Filter, 
  Download, 
  Cpu, 
  MoreVertical,
  ExternalLink,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchConnectors } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import KPICard from '@/components/dashboard/KPICard';

export default function Inventory() {
  const addToast = useStore((state) => state.addToast);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnectors()
      .then(setConnectors)
      .catch(() => addToast({ message: 'Failed to fetch inventory', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: connectors.length,
    active: connectors.filter(c => c.status === 'active').length,
    error: connectors.filter(c => c.status === 'error').length,
    providers: new Set(connectors.map(c => c.type)).size
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">AI System Inventory</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Comprehensive Registry of Authorized AI Assets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => addToast({ message: 'Compiling CSV inventory report...', type: 'info' })}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest hover:bg-[var(--soft-indigo)] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button 
            onClick={() => addToast({ message: 'Opening system registration module...', type: 'info' })}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--mid-indigo)] rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Register New System
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard 
          label="Registered Systems" 
          value={stats.total.toString()} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="Active Connections" 
          value={stats.active.toString()} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="External Providers" 
          value={stats.providers.toString()} 
          icon="systems" 
          status="primary" 
        />
        <KPICard 
          label="System Failures" 
          value={stats.error.toString()} 
          icon="risks" 
          status="danger" 
        />
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search by name, provider or type..." className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-[11px] font-bold text-[var(--text-primary)] w-80 focus:outline-none focus:border-[var(--royal-indigo)] transition-colors" />
          </div>
          <div className="h-8 w-px bg-[var(--border-default)] mx-2" />
          <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest hover:text-white transition-colors">
            Department <ChevronDown className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest hover:text-white transition-colors">
            Provider <ChevronDown className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest hover:text-white transition-colors">
            Status <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <button className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Inventory Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
              <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                <th className="px-6 py-4">System Name</th>
                <th className="px-6 py-4">Architecture / Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {connectors.length > 0 ? connectors.map((item) => (
                <tr key={item.id} className="group hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-[var(--ghost-violet)] flex items-center justify-center text-[var(--royal-indigo)]">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{item.name}</p>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{item.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-xs)] text-[var(--lavender)] font-bold">{item.type.toUpperCase()} ARCH</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      item.status === 'active' ? "bg-emerald-500/10 text-emerald-400" :
                      item.status === 'error' ? "bg-rose-500/10 text-rose-500" :
                      "bg-amber-500/10 text-amber-400"
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1 bg-[var(--bg-page)] rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            item.health_score < 40 ? "bg-rose-500" :
                            item.health_score < 80 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${item.health_score}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-[var(--text-primary)] tabular-nums">{item.health_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[var(--text-secondary)] text-[10px] font-bold uppercase">
                      GOVERNANCE
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      {item.last_scan_at ? new Date(item.last_scan_at).toLocaleDateString() : 'NEVER'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => addToast({ message: `Opening ${item.name} external link...`, type: 'info' })}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-white/5 transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => addToast({ message: `Viewing actions for ${item.name}...`, type: 'info' })}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-white/5 transition-all"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Cpu className="h-8 w-8 text-[var(--text-muted)]" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No AI systems registered yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
