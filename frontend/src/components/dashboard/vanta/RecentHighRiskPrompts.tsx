import { ShieldAlert, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const violations = [
  {
    id: 'V-8932',
    user: { name: 'Alex Chen', role: 'Senior Engineer', avatar: 'AC' },
    prompt: 'Write a script to bypass the new authentication portal...',
    type: 'Jailbreak',
    model: 'GPT-4',
    timestamp: '2 mins ago',
    severity: 'critical'
  },
  {
    id: 'V-8931',
    user: { name: 'Sarah Miller', role: 'Sales Rep', avatar: 'SM' },
    prompt: 'Can you summarize these customer medical records: [ATTACHED]...',
    type: 'PHI Leak',
    model: 'Claude 3.5 Sonnet',
    timestamp: '15 mins ago',
    severity: 'high'
  },
  {
    id: 'V-8930',
    user: { name: 'David Park', role: 'Marketing Lead', avatar: 'DP' },
    prompt: 'Generate API keys for the production database to test this...',
    type: 'Secret Exposure',
    model: 'GPT-4o',
    timestamp: '1 hour ago',
    severity: 'high'
  },
  {
    id: 'V-8929',
    user: { name: 'Emily Davis', role: 'HR Manager', avatar: 'ED' },
    prompt: 'Review the performance feedback containing salaries for...',
    type: 'PII',
    model: 'Gemini 1.5 Pro',
    timestamp: '3 hours ago',
    severity: 'medium'
  }
];

const badgeColors: Record<string, string> = {
  'Jailbreak': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'PHI Leak': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Secret Exposure': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'PII': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function RecentHighRiskPrompts() {
  return (
    <div className="flex flex-col rounded-2xl border border-white/5 bg-white/5 shadow-xl backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 p-6 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Recent High-Risk Prompts</h3>
            <p className="text-sm text-slate-400">Issues requiring immediate review</p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-400/10 transition">
          View All Flags
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto p-2">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Prompt Summary</th>
              <th className="px-4 py-3 font-semibold">Violation Type</th>
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold">Timestamp</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {violations.map((violation) => (
              <tr key={violation.id} className="group transition hover:bg-white/[0.03] rounded-lg">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white border border-white/10 group-hover:border-slate-500 transition">
                      {violation.user.avatar}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{violation.user.name}</span>
                      <span className="text-xs text-slate-500">{violation.user.role}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="max-w-xs truncate text-slate-300" title={violation.prompt}>
                    {violation.prompt}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    badgeColors[violation.type] || "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  )}>
                    {violation.type}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-400 font-medium">
                  {violation.model}
                </td>
                <td className="px-4 py-4 text-slate-500 text-xs font-medium whitespace-nowrap">
                  {violation.timestamp}
                </td>
                <td className="px-4 py-4 text-right">
                  <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition hover:shadow-lg hover:border-cyan-500/30">
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
