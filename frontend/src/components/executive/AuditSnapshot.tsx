import React from 'react';
import { Layers, AlertCircle, TrendingUp, Cpu } from 'lucide-react';

interface AuditSnapshotProps {
  scans: number;
  violations: number;
  budgetUsed: number;
  budgetLimit: number;
  connectors: number;
}

export const AuditSnapshot: React.FC<AuditSnapshotProps> = ({
  scans,
  violations,
  budgetUsed,
  budgetLimit,
  connectors
}) => {
  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
      <div className="flex flex-col">
        <div className="flex items-center space-x-2 text-white/40 mb-1">
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Scans (24h)</span>
        </div>
        <div className="text-xl font-bold text-white">{scans}</div>
        <div className="text-[9px] text-emerald-400/70 font-medium">+12% from avg</div>
      </div>

      <div className="flex flex-col border-l border-white/5 pl-4">
        <div className="flex items-center space-x-2 text-white/40 mb-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Violations</span>
        </div>
        <div className={`text-xl font-bold ${violations > 0 ? 'text-rose-400' : 'text-white'}`}>
          {violations}
        </div>
        <div className="text-[9px] text-white/30 font-medium">Auto-blocked</div>
      </div>

      <div className="flex flex-col border-l border-white/5 pl-4">
        <div className="flex items-center space-x-2 text-white/40 mb-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Daily Budget</span>
        </div>
        <div className="text-xl font-bold text-white">${budgetUsed.toFixed(2)}</div>
        <div className="text-[9px] text-white/30 font-medium">Limit: ${budgetLimit.toFixed(0)}</div>
      </div>

      <div className="flex flex-col border-l border-white/5 pl-4">
        <div className="flex items-center space-x-2 text-white/40 mb-1">
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Connectors</span>
        </div>
        <div className="text-xl font-bold text-white">{connectors}</div>
        <div className="text-[9px] text-emerald-400/70 font-medium">All Healthy</div>
      </div>
    </div>
  );
};
