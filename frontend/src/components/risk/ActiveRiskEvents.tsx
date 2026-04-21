import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const events = [
  {
    id: 1,
    title: 'Recommendation engine — PHI sent to external API without BAA',
    description: 'Patient diagnosis fields transmitted to OpenAI endpoint. No Business Associate Agreement on file. Direct HIPAA §164.312(a) violation.',
    time: '7 min ago',
    badges: [
      { text: 'Critical', type: 'critical' },
      { text: 'HIPAA', type: 'framework' },
      { text: 'Data in transit', type: 'category' },
      { text: 'Expandable +', type: 'action' }
    ]
  },
  {
    id: 2,
    title: 'HR screening model — processing Aadhaar numbers without consent log',
    description: 'Model reads Aadhaar numbers from resume uploads. No consent event recorded before processing. DPDP Act §6 requires explicit consent for sensitive personal data.',
    time: '1 hr ago',
    badges: [
      { text: 'Critical', type: 'critical' },
      { text: 'DPDP', type: 'framework' },
      { text: 'Consent', type: 'category' },
      { text: 'Expandable +', type: 'action' }
    ]
  },
  {
    id: 3,
    title: 'Recommendation engine — zero audit trail for PHI access (17 days)',
    description: 'Every access to protected health information must produce a timestamped log. This model has none. This is the first thing a HIPAA auditor will check.',
    time: 'Ongoing · 17 days',
    badges: [
      { text: 'Critical', type: 'critical' },
      { text: 'HIPAA', type: 'framework' },
      { text: 'Logging', type: 'category' },
      { text: 'Expandable +', type: 'action' }
    ]
  },
  {
    id: 4,
    title: 'Customer support bot — personal data stored beyond retention window',
    description: 'Conversation logs containing names and email addresses kept indefinitely. GDPR Article 5(1)(e) requires a defined and enforced retention period.',
    time: '3 days',
    badges: [
      { text: 'Medium', type: 'medium' },
      { text: 'GDPR', type: 'framework' },
      { text: 'Data retention', type: 'category' }
    ]
  }
];

function EventBadge({ text, type }: { text: string; type: string }) {
  const styles: Record<string, string> = {
    'critical': 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    'medium': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    'framework': 'border-white/10 bg-white/5 text-slate-100',
    'category': 'border-white/10 bg-white/5 text-slate-100',
    'action': 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase",
      styles[type] || 'border-white/10 bg-white/5 text-slate-300'
    )}>
      {text}
    </span>
  );
}

export function ActiveRiskEvents() {
  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Active Risk Events — Requires Your Attention
      </h2>
      
      <div className="flex flex-col rounded-lg border border-white/5 bg-white/5 shadow-lg backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <div className="text-xs font-bold text-slate-100">
            2 critical <span className="mx-1 text-slate-600">·</span> 4 medium <span className="mx-1 text-slate-600">·</span> 7 low
          </div>
          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400">
            2 unacknowledged
          </span>
        </div>

        {/* List */}
        <div className="flex flex-col divide-y divide-white/5">
          {events.map((event, idx) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="p-5 transition hover:bg-white/[0.02] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className={cn(
                    "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                    event.badges[0].type === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                  )} />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">{event.title}</h4>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-4xl">
                      {event.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.badges.map((b, i) => (
                        <EventBadge key={i} text={b.text} type={b.type} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  {event.time}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
