import React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FrameworkStatus {
  name: string;
  score: number;
  status: 'passing' | 'warning' | 'critical';
  checksPassed: number;
  totalChecks: number;
  lastScan: string;
  openIssues: number;
}

interface ComplianceBreakdownProps {
  frameworks: FrameworkStatus[];
}

export const ComplianceBreakdown: React.FC<ComplianceBreakdownProps> = ({ frameworks }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Framework Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {frameworks.map((fw) => (
          <div key={fw.name} className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className={cn(
                  "h-4 w-4",
                  fw.status === 'passing' ? "text-emerald-500" : fw.status === 'warning' ? "text-amber-500" : "text-rose-500"
                )} />
                <span className="text-sm font-black text-white uppercase">{fw.name}</span>
              </div>
              <span className={cn(
                "text-lg font-black tracking-tight",
                fw.status === 'passing' ? "text-emerald-500" : fw.status === 'warning' ? "text-amber-500" : "text-rose-500"
              )}>{fw.score}%</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Checks Passed</span>
                <span>{fw.checksPassed}/{fw.totalChecks}</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    fw.status === 'passing' ? "bg-emerald-500" : fw.status === 'warning' ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${(fw.checksPassed / fw.totalChecks) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[9px] font-bold text-slate-600 uppercase">Scan: {fw.lastScan}</span>
              {fw.openIssues > 0 && (
                <span className="text-[9px] font-black text-rose-500 uppercase">{fw.openIssues} Issues</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
