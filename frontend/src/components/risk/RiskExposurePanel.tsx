import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function RiskExposurePanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* Left Panel: Exposure by Framework */}
      <div className="rounded-lg border border-white/5 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white mb-6">Exposure by framework</h3>
        
        <div className="space-y-6">
          {/* HIPAA */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold text-slate-200">HIPAA</span>
              <span className="text-slate-300">High · 2 critical / open</span>
            </div>
            <div className="h-1 w-full bg-white/10 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" 
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">PHI logging + BAA gaps are the core issues</p>
          </div>

          {/* DPDP */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold text-slate-200">DPDP</span>
              <span className="text-slate-300">High · 1 critical / open</span>
            </div>
            <div className="h-1 w-full bg-white/10 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" 
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Consent not captured for sensitive personal data</p>
          </div>

          {/* GDPR */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold text-slate-200">GDPR</span>
              <span className="text-slate-300">Medium · 0 critical</span>
            </div>
            <div className="h-1 w-full bg-white/10 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '35%' }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Data retention policy missing on 2 models</p>
          </div>
        </div>
      </div>

      {/* Right Panel: Risk trend */}
      <div className="rounded-lg border border-white/5 bg-white/5 p-6 shadow-lg backdrop-blur-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Risk trend — last 7 days</h3>
          <p className="text-xs text-slate-400 mt-1">Violations detected per day</p>
        </div>

        <div className="mt-8">
          <div className="flex items-end justify-between gap-2 h-16">
            {/* CSS Histogram mocking the screenshot */}
            {[
              { height: '20%', color: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
              { height: '25%', color: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
              { height: '22%', color: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
              { height: '40%', color: 'border-amber-500/50', bg: 'bg-amber-500/10' },
              { height: '35%', color: 'border-amber-500/50', bg: 'bg-amber-500/10' },
              { height: '45%', color: 'border-rose-500/50', bg: 'bg-rose-500/10' },
              { height: '70%', color: 'border-rose-500', bg: 'bg-rose-500/20' }, // Today, active
            ].map((bar, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: bar.height }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
                className={cn("flex-1 border-t-2 opacity-80", bar.color, bar.bg)}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
            <span>7 days ago</span>
            <span>Today</span>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-rose-400">
          Risk increasing — up 38% this week. <span className="text-slate-300 font-normal">Trigger: HR model deployed 4 days ago.</span>
        </p>
      </div>

    </div>
  );
}
