import { motion } from 'framer-motion';

export function RiskPosture() {
  return (
    <div className="space-y-4">
      <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Risk Posture — Right Now
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Overall Risk Score Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 md:col-span-1 rounded-lg border border-rose-500/20 bg-white/5 p-5 shadow-lg"
        >
          <p className="text-xs font-semibold text-slate-300">Overall risk score</p>
          <div className="mt-1">
            <h3 className="text-3xl font-black text-rose-500 tracking-tight">HIGH</h3>
          </div>
          
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden flex">
              <div className="h-full bg-rose-500 w-[72%] rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            </div>
            <span className="text-xs font-bold text-slate-300">72 / 100</span>
          </div>
          
          <p className="mt-4 text-[10px] font-medium text-slate-400">
            Up from 68 yesterday
          </p>
        </motion.div>

        {/* Critical Violations Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-white/5 bg-white/5 p-5 transition hover:bg-white/[0.07]"
        >
          <p className="text-xs font-semibold text-slate-300">Critical violations</p>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-rose-400">3</h3>
          </div>
          <p className="mt-6 text-[10px] font-medium text-slate-300">
            Need immediate action
          </p>
        </motion.div>

        {/* AI Models at Risk Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-white/5 bg-white/5 p-5 transition hover:bg-white/[0.07]"
        >
          <p className="text-xs font-semibold text-slate-300">AI models at risk</p>
          <div className="mt-2 flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-amber-400">2</h3>
            <span className="text-lg font-bold text-slate-400">/ 7</span>
          </div>
          <p className="mt-6 text-[10px] font-medium text-slate-300">
            28% of your fleet
          </p>
        </motion.div>

        {/* Requests Blocked Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-white/5 bg-white/5 p-5 transition hover:bg-white/[0.07]"
        >
          <p className="text-xs font-semibold text-slate-300">Requests blocked today</p>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-emerald-400">14</h3>
          </div>
          <p className="mt-6 text-[10px] font-medium text-slate-300">
            Threats stopped before harm
          </p>
        </motion.div>

      </div>
    </div>
  );
}
