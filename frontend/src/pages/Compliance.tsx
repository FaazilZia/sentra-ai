import { Gavel, Globe, Lock, FileText, TrendingDown } from 'lucide-react';

export default function CompliancePage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-24 pb-32 px-8 pt-16">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-sm font-black tracking-widest text-slate-500 uppercase">Regulatory Governance OS</h1>
        <p className="text-5xl font-black text-white tracking-tighter max-w-2xl">
          Framework Compliance Analysis.
        </p>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {[
          { name: 'GDPR', readiness: '94%', violations: 12, status: 'Ready' },
          { name: 'HIPAA', readiness: '88%', violations: 5, status: 'In Scope' },
          { name: 'DPDP', readiness: '92%', violations: 8, status: 'Ready' }
        ].map((framework) => (
          <div key={framework.name} className="space-y-6">
            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{framework.name} Framework</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>

              <div>
                <h3 className="text-7xl font-black text-white tracking-tighter">{framework.readiness}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Readiness Score</p>
              </div>
            </div>

            <div className="px-4 flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Violations Blocked</p>
                  <p className="text-lg font-black text-white mt-1">{framework.violations}</p>
               </div>
               <button className="text-[9px] font-black text-white uppercase tracking-widest hover:text-slate-400 transition-all">
                 View Details →
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Global Audit Log CTA */}
      <div className="p-12 rounded-[2.5rem] bg-slate-900/20 border border-dashed border-white/10 flex flex-col items-center text-center space-y-8">
         <div className="space-y-3">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Generate Final Audit Report</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Export a cryptographically signed compliance ledger for regulatory submission.</p>
         </div>
         <button className="px-10 py-5 rounded-2xl bg-white text-slate-950 text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
            Download PDF Report
         </button>
      </div>
    </div>
  );
}
