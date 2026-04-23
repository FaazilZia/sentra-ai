import { ShieldAlert, ArrowRight, ShieldBan, ShieldCheck, FileSearch, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViolationData, ActionType } from '@/hooks/useDashboardData';

const badgeColors: Record<string, string> = {
  'Jailbreak': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'PHI Leak': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'Secret Exposure': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'PII': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Sensitive Document Access': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Data Leakage': 'bg-red-500/20 text-red-300 border-red-500/30',
};

const actionStyles: Record<ActionType, { bg: string, text: string, icon: any }> = {
  'BLOCK': { bg: 'bg-rose-500/20 border-rose-500/30', text: 'text-rose-300', icon: ShieldBan },
  'REQUIRE REVIEW': { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300', icon: FileSearch },
  'ALLOW WITH WARNING': { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-300', icon: ShieldCheck },
};

export function RecentHighRiskPrompts({ data }: { data: ViolationData[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-6 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Active Security Violations</h3>
            <p className="text-sm font-medium text-slate-100">Requires immediate intervention</p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-400/10 transition">
          View Audit Logs
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto p-2">
        <table className="w-full text-left text-sm text-slate-100">
          <thead className="text-[11px] font-black uppercase tracking-wider text-slate-300 bg-slate-900/50">
            <tr>
              <th className="px-4 py-4 rounded-tl-lg">User</th>
              <th className="px-4 py-4">Prompt Trigger</th>
              <th className="px-4 py-4">Why Blocked</th>
              <th className="px-4 py-4">AI Decision</th>
              <th className="px-4 py-4">Model</th>
              <th className="px-4 py-4">Timestamp</th>
              <th className="px-4 py-4 text-right rounded-tr-lg">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.map((violation) => {
              const ActionIcon = actionStyles[violation.action].icon;
              return (
              <tr key={violation.id} className="group transition hover:bg-white/[0.04]">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-xs font-black text-white border border-white/20">
                      {violation.user.avatar}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-white tracking-tight">{violation.user.name}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">{violation.user.role}</span>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className={cn(
                      "inline-flex self-start items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      badgeColors[violation.type] || "bg-slate-500/20 text-slate-100 border-slate-500/30"
                    )}>
                      {violation.type}
                    </span>
                    <p className="max-w-[200px] truncate text-slate-100 font-medium text-xs" title={violation.prompt}>
                      "{violation.prompt}"
                    </p>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-100">{violation.whyBlocked}</span>
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      <Scale className="h-3 w-3" />
                      {violation.regulatoryReference}
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm",
                    actionStyles[violation.action].bg,
                    actionStyles[violation.action].text
                  )}>
                    <ActionIcon className="h-3 w-3" />
                    {violation.action}
                  </div>
                </td>
                
                <td className="px-4 py-4 text-slate-100 font-medium text-xs">
                  {violation.model}
                </td>
                
                <td className="px-4 py-4 text-slate-300 text-xs font-bold whitespace-nowrap">
                  {violation.timestamp}
                </td>
                
                <td className="px-4 py-4 text-right">
                  <button className="rounded border border-cyan-500/50 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                    Investigate
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
