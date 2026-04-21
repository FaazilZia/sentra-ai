import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const ownerships = [
  { team: 'Payments team', model: 'Recommendation engine', risks: '2 critical', status: 'Unacknowledged', type: 'critical' },
  { team: 'HR team', model: 'HR screening model', risks: '1 critical', status: 'Unacknowledged', type: 'critical' },
  { team: 'CX team', model: 'Customer support bot', risks: '1 medium', status: 'Acknowledged', type: 'medium' },
  { team: 'Risk team', model: 'Fraud detection model', risks: '1 medium', status: 'In review', type: 'medium' }
];

export function RiskOwnership() {
  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Who Owns This Risk
      </h2>
      
      <div className="overflow-hidden rounded-lg border border-white/5 bg-white/5 shadow-lg backdrop-blur-sm">
        <table className="w-full text-left text-sm text-slate-100">
          <tbody className="divide-y divide-white/5">
            {ownerships.map((row, idx) => (
              <motion.tr 
                key={row.team}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="transition hover:bg-white/[0.02]"
              >
                <td className="p-4 font-bold text-white w-1/4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-slate-800 flex items-center justify-center text-[8px] border border-white/10">
                      {row.team.charAt(0)}
                    </div>
                    {row.team}
                  </div>
                </td>
                <td className="p-4 text-slate-300 w-1/3">
                  {row.model}
                </td>
                <td className="p-4 w-1/6">
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
                    row.type === 'critical' ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  )}>
                    {row.risks}
                  </span>
                </td>
                <td className="p-4 text-xs font-medium text-slate-400 text-right w-1/4">
                  {row.status}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <p className="mt-6 text-[11px] leading-relaxed text-slate-300 max-w-5xl">
        <strong className="text-white">What this means for your organisation right now:</strong> Your biggest exposure is the recommendation engine touching health data with no audit trail and no BAA — that's a HIPAA auditor's first stop. Fix these two issues and your overall risk score drops from 72 to approximately 48 (medium). The HR screening model's consent gap is the second priority — it is actively processing Aadhaar numbers without a legal basis under DPDP. <strong className="text-emerald-400">Fixing these 3 issues this week removes roughly 80% of your current compliance exposure.</strong>
      </p>
    </div>
  );
}
