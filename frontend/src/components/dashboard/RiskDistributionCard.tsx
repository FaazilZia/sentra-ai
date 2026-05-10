import { PieChart } from 'lucide-react';

interface Category {
  label: string;
  count: number;
  color: string;
  text: string;
}

interface RiskDistributionCardProps {
  data?: Category[];
  isLoading?: boolean;
}

export default function RiskDistributionCard({ data = [], isLoading = false }: RiskDistributionCardProps) {
  const total = data.reduce((acc, cat) => acc + cat.count, 0);

  return (
    <div className="card-base p-6 flex flex-col bg-white h-full">
      <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] mb-6">Aggregate Risk Distribution</h3>

      {/* Segmented Bar */}
      <div className="h-6 w-full flex rounded overflow-hidden border-[0.5px] border-[var(--border-default)] bg-[var(--bg-page)]/50">
        {isLoading ? (
          <div className="w-full h-full animate-pulse bg-[var(--bg-page)]" />
        ) : data.length > 0 ? (
          data.map((cat) => (
            <div 
              key={cat.label}
              className="h-full transition-all hover:opacity-80 cursor-help"
              style={{ 
                width: `${(cat.count / total) * 100}%`,
                backgroundColor: cat.color
              }}
              title={`${cat.label}: ${cat.count} items`}
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-40">Awaiting model telemetry</span>
          </div>
        )}
      </div>

      {/* Legend Pills */}
      <div className="mt-8 flex flex-wrap gap-2.5 flex-1 content-start">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
             <div key={i} className="h-8 w-20 bg-[var(--bg-page)] animate-pulse rounded" />
          ))
        ) : data.length > 0 ? (
          data.map((cat) => (
            <div 
              key={cat.label}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-page)]/50 hover:bg-[var(--ghost-violet)]/30 transition-all cursor-default group"
            >
              <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{cat.label}</span>
              <span 
                className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm"
                style={{ backgroundColor: cat.color, color: cat.text }}
              >
                {cat.count}
              </span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center w-full py-10 opacity-20 space-y-3">
             <PieChart className="h-10 w-10 text-[var(--text-muted)]" />
             <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No registered AI systems</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 flex items-center justify-between border-t border-[var(--border-default)]">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Global Asset Count</p>
        <p className="text-[var(--text-xl)] font-black text-[var(--text-primary)]">{total || '--'}</p>
      </div>
    </div>
  );
}
