import { ExternalLink, Edit3, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIItem {
  id: string;
  name: string;
  type: string;
  owner: string;
  riskScore: number;
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
}

interface AIRegistryTableProps {
  data?: AIItem[];
  isLoading?: boolean;
}

export default function AIRegistryTable({ data = [], isLoading = false }: AIRegistryTableProps) {
  return (
    <div className="card-base flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
        <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)]">AI System Registry</h3>
        <button 
          disabled={data.length === 0}
          className="text-[var(--text-xs)] font-bold text-[var(--royal-indigo)] uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline"
        >
          Full Catalog
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[var(--bg-page)] border-b border-[var(--border-default)]">
            <tr className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">
              <th className="px-6 py-3">AI System</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Risk Level</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)] min-h-[400px]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="h-4 bg-[var(--bg-page)] rounded w-full" />
                  </td>
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((system) => (
                <tr key={system.id} className="group hover:bg-[var(--bg-hover)] transition-colors cursor-default">
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-base)] font-bold text-[var(--text-primary)]">{system.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-xs)] text-[var(--text-secondary)]">{system.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-xs)] text-[var(--text-secondary)] font-medium">{system.owner}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-1 bg-[var(--border-default)] rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            system.riskScore > 75 ? "bg-[var(--risk-critical)]" :
                            system.riskScore > 40 ? "bg-[var(--risk-medium)]" : "bg-[var(--risk-low)]"
                          )}
                          style={{ width: `${system.riskScore}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-[var(--text-primary)]">{system.riskScore}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      system.status === 'ACTIVE' ? "bg-[var(--risk-low)] text-[var(--risk-low-text)]" :
                      system.status === 'BLOCKED' ? "bg-[var(--risk-critical)] text-[var(--risk-critical-text)]" :
                      "bg-[var(--risk-medium)] text-[var(--risk-medium-text)]"
                    )}>
                      {system.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-[var(--ghost-violet)] transition-all">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--royal-indigo)] hover:bg-[var(--ghost-violet)] transition-all">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Database className="h-10 w-10 text-[var(--text-muted)] opacity-20" />
                    <p className="text-[var(--text-xs)] font-bold text-[var(--text-muted)] uppercase tracking-widest">No registered AI systems found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
