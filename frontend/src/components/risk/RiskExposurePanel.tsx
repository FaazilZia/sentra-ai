import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RiskExposurePanelProps {
  riskData: any;
  riskTrend?: any[];
}

export function RiskExposurePanel({ riskData }: RiskExposurePanelProps) {
  const frameworks = riskData?.frameworks || [];

  return (
    <div className="flex flex-col gap-8 h-full">
      
      {/* Panel: Exposure by Framework */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0d1424] p-8 shadow-2xl backdrop-blur-sm h-full">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Exposure by Framework</h3>
        
        <div className="space-y-8">
          {frameworks.length === 0 ? (
            <div className="py-12 text-center">
               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No framework exposure data available</p>
            </div>
          ) : frameworks.map((f: any, idx: number) => (
            <div key={f.name}>
              <div className="flex justify-between items-end mb-3">
                <span className="font-black text-white text-sm tracking-tight uppercase">{f.name}</span>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", f.color === 'rose' ? "text-rose-400" : "text-amber-400")}>{f.status}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${f.exposure}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: idx * 0.1 }}
                  className={cn("h-full rounded-full", f.color === 'rose' ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]" : "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]")} 
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-3 font-medium tracking-wide">{f.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
