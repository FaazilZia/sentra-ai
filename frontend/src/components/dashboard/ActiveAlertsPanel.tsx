import { Bell, Zap, ChevronRight, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  title: string;
  system: string;
  severity: 'critical' | 'high' | 'medium';
  time: string;
}

interface ActiveAlertsPanelProps {
  data?: Alert[];
  isLoading?: boolean;
}

export default function ActiveAlertsPanel({ data = [], isLoading = false }: ActiveAlertsPanelProps) {
  const statusColors = {
    critical: 'var(--risk-critical)',
    high: 'var(--risk-high)',
    medium: 'var(--risk-medium)',
  };

  return (
    <div className="card-base h-full flex flex-col bg-white">
      <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Bell className="h-4 w-4 text-[var(--royal-indigo)]" />
           <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)]">Priority Alerts</h3>
        </div>
        {data.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--risk-critical)] text-[var(--risk-critical-text)] text-[9px] font-black tracking-widest animate-pulse">
            {data.length} ACTIVE
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-page)]/20 animate-pulse">
              <div className="h-2 bg-[var(--bg-page)] rounded w-1/4 mb-3" />
              <div className="h-4 bg-[var(--bg-page)] rounded w-3/4" />
            </div>
          ))
        ) : data.length > 0 ? (
          data.map((alert) => (
            <div 
              key={alert.id}
              className="group relative p-3.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-page)]/30 hover:bg-[var(--bg-hover)] hover:border-[var(--royal-indigo)] transition-all cursor-pointer shadow-sm"
              style={{ borderLeft: `3px solid ${statusColors[alert.severity as keyof typeof statusColors]}` }}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  alert.severity === 'critical' ? "text-[var(--risk-critical-text)]" :
                  alert.severity === 'high' ? "text-[var(--risk-high-text)]" : "text-[var(--risk-medium-text)]"
                )}>
                  {alert.severity}
                </span>
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{alert.time}</span>
              </div>
              <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)] group-hover:text-[var(--royal-indigo)] transition-colors leading-tight">{alert.title}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Zap className="h-3 w-3 text-[var(--lavender)]" />
                <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-tight">{alert.system}</p>
              </div>
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                <ChevronRight className="h-4 w-4 text-[var(--royal-indigo)]" />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 space-y-3 opacity-30 py-10">
            <ShieldAlert className="h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">
              No active policy violations
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-default)]">
        <button 
           disabled={data.length === 0}
           className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--royal-indigo)] uppercase tracking-[0.2em] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          Detailed Monitoring <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
