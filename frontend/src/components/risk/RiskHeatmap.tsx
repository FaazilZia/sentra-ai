import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const models = [
  {
    name: 'Recommendation engine',
    subtext: 'GPT-4o · Payments team',
    dataPrivacy: 'Medium',
    consent: 'OK',
    piiExposure: 'High',
    accessControl: 'Medium',
    auditLogging: 'None',
    overall: 'Critical'
  },
  {
    name: 'Customer support bot',
    subtext: 'Claude 3.5 · CX team',
    dataPrivacy: 'OK',
    consent: 'Medium',
    piiExposure: 'OK',
    accessControl: 'OK',
    auditLogging: 'OK',
    overall: 'Medium'
  },
  {
    name: 'HR screening model',
    subtext: 'Internal · HR team',
    dataPrivacy: 'High',
    consent: 'High',
    piiExposure: 'N/A',
    accessControl: 'Medium',
    auditLogging: 'Medium',
    overall: 'Critical'
  },
  {
    name: 'Document summarizer',
    subtext: 'Gemini 1.5 · Legal team',
    dataPrivacy: 'OK',
    consent: 'OK',
    piiExposure: 'OK',
    accessControl: 'OK',
    auditLogging: 'OK',
    overall: 'Low'
  },
  {
    name: 'Fraud detection model',
    subtext: 'Internal · Risk team',
    dataPrivacy: 'Medium',
    consent: 'OK',
    piiExposure: 'OK',
    accessControl: 'OK',
    auditLogging: 'OK',
    overall: 'Medium'
  }
];

function RiskBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    'Critical': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'High': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'Medium': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    'Low': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    'OK': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    'None': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'N/A': 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold tracking-wide",
      styles[value] || 'border-slate-500/30 bg-slate-500/10 text-slate-300'
    )}>
      {value}
    </span>
  );
}

export function RiskHeatmap() {
  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Risk Heatmap — All AI Models
      </h2>
      <div className="overflow-hidden rounded-lg border border-white/5 bg-white/5 shadow-lg backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-100">
            <thead className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Model | System</th>
                <th className="p-4">Data privacy</th>
                <th className="p-4">Consent</th>
                <th className="p-4">PII exposure</th>
                <th className="p-4">Access control</th>
                <th className="p-4">Audit logging</th>
                <th className="p-4 text-right">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {models.map((model, idx) => (
                <motion.tr 
                  key={model.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="transition hover:bg-white/[0.02]"
                >
                  <td className="p-4">
                    <div className="font-semibold text-slate-200">{model.name}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{model.subtext}</div>
                  </td>
                  <td className="p-4"><RiskBadge value={model.dataPrivacy} /></td>
                  <td className="p-4"><RiskBadge value={model.consent} /></td>
                  <td className="p-4"><RiskBadge value={model.piiExposure} /></td>
                  <td className="p-4"><RiskBadge value={model.accessControl} /></td>
                  <td className="p-4"><RiskBadge value={model.auditLogging} /></td>
                  <td className="p-4 text-right"><RiskBadge value={model.overall} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
