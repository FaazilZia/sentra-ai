import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RiskOwnershipProps {
  agents: any[];
}

export function RiskOwnership({ agents }: RiskOwnershipProps) {
  // Map agents to ownership rows. If agents don't have teams, use placeholders.
  const displayAgents = agents.length > 0 ? agents.slice(0, 4) : [
    { name: 'Recommendation engine', team: 'Payments Team', status: 'Unacknowledged', risks: '2 Critical' },
    { name: 'HR screening model', team: 'HR Team', status: 'Unacknowledged', risks: '1 Critical' },
    { name: 'Customer support bot', team: 'CX Team', status: 'Acknowledged', risks: '1 Medium' }
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        Accountability & Ownership
      </h2>
      
      <div className="flex-1 overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0d1424] shadow-2xl">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {displayAgents.map((agent, idx) => (
              <motion.tr 
                key={agent.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="transition hover:bg-white/[0.02] group"
              >
                <td className="px-6 py-5 font-bold text-white uppercase tracking-tight">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center text-[10px] text-cyan-400 font-black">
                      {((agent.team || 'S').charAt(0))}
                    </div>
                    {agent.team || 'System Engine'}
                  </div>
                </td>
                <td className="px-6 py-5 text-slate-400 text-xs font-medium">
                  {agent.name}
                </td>
                <td className="px-6 py-5 text-right">
                  <span className={cn(
                    "inline-flex items-center rounded-md border px-2.5 py-1 text-[9px] font-black tracking-widest uppercase",
                    (agent.risks || '').toLowerCase().includes('critical') ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  )}>
                    {agent.risks || 'No Active Risks'}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-2 p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
        <p className="text-[11px] leading-relaxed text-slate-400">
          <strong className="text-white uppercase tracking-wider">Quantified Impact Analysis:</strong> Resolving the top 3 unacknowledged risks across your agent fleet will reduce overall compliance exposure by <strong className="text-cyan-400">approx. 82%</strong>. The Payments Team is the priority focus for remediation of data transit policy breaches.
        </p>
      </div>
    </div>
  );
}
