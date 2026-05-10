import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RiskHeatmapProps {
  riskData: any;
  attackPatterns?: any[];
}

function RiskBadge({ value }: { value: string }) {
  const v = value.toUpperCase();
  const styles: Record<string, string> = {
    'CRITICAL': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'HIGH': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'MEDIUM': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    'LOW': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    'OK': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    'FAIL': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'PASS': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-black tracking-widest uppercase",
      styles[v] || 'border-slate-500/30 bg-slate-500/10 text-slate-400'
    )}>
      {value}
    </span>
  );
}

export function RiskHeatmap({ riskData }: RiskHeatmapProps) {
  // If we have live segments in riskData, use them. Otherwise show placeholder/empty.
  const segments = riskData?.segments || [];

  return (
    <div className="space-y-6">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        Risk Matrix — Critical Systems
      </h2>
      <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0d1424] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-slate-950/30 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Model | Agent</th>
                <th className="px-6 py-4 text-center">Data Privacy</th>
                <th className="px-6 py-4 text-center">PII Exposure</th>
                <th className="px-6 py-4 text-center">Access Control</th>
                <th className="px-6 py-4 text-right">Overall Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    No critical systems mapped yet
                  </td>
                </tr>
              ) : segments.map((model: any, idx: number) => (
                <motion.tr 
                  key={model.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="transition hover:bg-white/[0.02] group"
                >
                  <td className="px-6 py-5">
                    <div className="font-bold text-white uppercase tracking-tighter group-hover:text-cyan-400 transition-colors">{model.name}</div>
                    <div className="mt-1 text-[9px] text-slate-500 uppercase tracking-widest">{model.team}</div>
                  </td>
                  <td className="px-6 py-5 text-center"><RiskBadge value={model.privacy} /></td>
                  <td className="px-6 py-5 text-center"><RiskBadge value={model.pii} /></td>
                  <td className="px-6 py-5 text-center"><RiskBadge value={model.access} /></td>
                  <td className="px-6 py-5 text-right"><RiskBadge value={model.overall} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
