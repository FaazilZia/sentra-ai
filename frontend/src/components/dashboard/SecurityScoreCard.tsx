import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityScoreCardProps {
  score: number;
}

export const SecurityScoreCard: React.FC<SecurityScoreCardProps> = ({ score }) => {
  const isHigh = score > 80;
  const isMid = score > 50 && score <= 80;

  return (
    <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col justify-between relative overflow-hidden group">
      {/* Background Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20 transition-colors duration-1000",
        isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500"
      )} />

      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Infrastructure Health</h3>
          <p className="text-lg font-bold text-white flex items-center gap-2">
            Security Score
            <ShieldCheck className={cn("w-5 h-5", isHigh ? "text-emerald-400" : "text-amber-400")} />
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative h-48 w-48 flex items-center justify-center">
          <svg className="h-full w-full rotate-[-90deg]">
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-slate-800"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray="502.65"
              initial={{ strokeDashoffset: 502.65 }}
              animate={{ strokeDashoffset: 502.65 - (502.65 * score) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn(
                "transition-colors duration-1000",
                isHigh ? "text-emerald-500" : isMid ? "text-amber-500" : "text-rose-500"
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-6xl font-black tracking-tighter text-white"
            >
              {score}
            </motion.span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Percentile</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-2 gap-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
           <p className={cn("text-xs font-bold", isHigh ? "text-emerald-400" : "text-amber-400")}>
             {isHigh ? 'Optimized' : 'Review Required'}
           </p>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Trend</p>
           <p className="text-xs font-bold text-indigo-400">+4.2% Growth</p>
        </div>
      </div>
    </div>
  );
};
