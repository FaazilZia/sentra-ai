import { History } from 'lucide-react';

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  color: string;
}

interface RecentActivityFeedProps {
  data?: Activity[];
  isLoading?: boolean;
}

export default function RecentActivityFeed({ data = [], isLoading = false }: RecentActivityFeedProps) {
  return (
    <div className="card-base p-6 flex flex-col h-full bg-white">
      <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] mb-8">System Activity Feed</h3>

      <div className="flex-1 space-y-6 relative min-h-[300px]">
        {data.length > 0 && (
          <div className="absolute left-[17px] top-2 bottom-4 w-[1px] bg-[var(--border-default)]" />
        )}

        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-[var(--bg-page)]" />
              <div className="flex-1 py-1 space-y-2">
                <div className="h-3 bg-[var(--bg-page)] rounded w-3/4" />
                <div className="h-2 bg-[var(--bg-page)] rounded w-1/4" />
              </div>
            </div>
          ))
        ) : data.length > 0 ? (
          data.map((item) => (
            <div key={item.id} className="flex gap-4 relative group">
              {/* Avatar Circle */}
              <div className="h-9 w-9 rounded-full bg-[var(--bg-page)] border border-[var(--border-default)] flex items-center justify-center shrink-0 z-10 group-hover:border-[var(--royal-indigo)] group-hover:bg-[var(--ghost-violet)] transition-all">
                 <span className="text-[10px] font-black text-[var(--royal-indigo)] uppercase tracking-tighter">{item.user}</span>
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex justify-between items-start">
                  <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
                    <span className="font-bold text-[var(--text-primary)]">{item.user}</span> {item.action}{' '}
                    <span className="font-bold text-[var(--royal-indigo)] cursor-pointer hover:underline">{item.target}</span>
                  </p>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter shrink-0 ml-4">{item.time}</span>
                </div>
                
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Audit Event</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 space-y-3 opacity-30 py-10 h-full">
            <History className="h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">
              No recent governance events
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button 
          disabled={data.length === 0}
          className="w-full py-2 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--royal-indigo)] uppercase tracking-[0.2em] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          Global Activity History
        </button>
      </div>
    </div>
  );
}
