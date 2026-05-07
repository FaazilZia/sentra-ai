import { cn } from '@/lib/utils';
import { ClipboardCheck } from 'lucide-react';

interface Regulation {
  name: string;
  progress: number;
  status: string;
}

interface ComplianceTrackerProps {
  data?: Regulation[];
  isLoading?: boolean;
}

export default function ComplianceTracker({ data = [], isLoading = false }: ComplianceTrackerProps) {
  const averageScore = data.length > 0 
    ? Math.round(data.reduce((acc, reg) => acc + reg.progress, 0) / data.length)
    : 0;

  return (
    <div className="card-base p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)]">Regulatory Compliance</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            data.length > 0 ? "bg-[var(--risk-low)] animate-pulse" : "bg-[var(--text-muted)]"
          )} />
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            Score: {data.length > 0 ? `${averageScore}%` : '--'}
          </span>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-3 bg-[var(--bg-page)] rounded w-1/2" />
              <div className="h-1 bg-[var(--bg-page)] rounded w-full" />
            </div>
          ))
        ) : data.length > 0 ? (
          data.map((reg) => (
            <div key={reg.name} className="space-y-2 group cursor-pointer">
              <div className="flex justify-between items-end">
                <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)] group-hover:text-[var(--royal-indigo)] transition-colors">{reg.name}</p>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-[var(--text-muted)] tabular-nums">{reg.progress}%</span>
                   <span className={cn(
                     "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                     reg.progress > 85 ? "bg-[var(--risk-low)] text-[var(--risk-low-text)]" :
                     reg.progress > 60 ? "bg-[var(--risk-medium)] text-[var(--risk-medium-text)]" :
                     "bg-[var(--risk-critical)] text-[var(--risk-critical-text)]"
                   )}>
                     {reg.progress > 85 ? 'HEALTHY' : reg.progress > 60 ? 'WARN' : 'ACTION'}
                   </span>
                </div>
              </div>
              
              <div className="h-1 bg-[var(--bg-page)] rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-in-out shadow-sm",
                    reg.progress > 85 ? "bg-[var(--risk-low)]" :
                    reg.progress > 60 ? "bg-[var(--risk-medium)]" : "bg-[var(--risk-critical)]"
                  )}
                  style={{ width: `${reg.progress}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 space-y-3 opacity-30 py-10">
            <ClipboardCheck className="h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">
              No compliance frameworks connected
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button 
          disabled={data.length === 0}
          className="btn-secondary w-full !text-[10px] uppercase tracking-widest font-black !py-2.5 disabled:opacity-20 disabled:cursor-not-allowed"
        >
          Compliance Center
        </button>
      </div>
    </div>
  );
}
