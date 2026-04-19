import { Gavel, Globe, Lock, FileText, TrendingDown } from 'lucide-react';

export default function CompliancePage() {

  return (
    <div className="mx-auto max-w-[1440px] space-y-12 pb-12 px-6 pt-10">
      {/* Premium Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4 uppercase">
          <Gavel className="h-10 w-10 text-white" />
          Regulatory Governance
        </h1>
        <p className="text-slate-400 font-medium max-w-2xl text-lg">
          Real-time compliance monitoring and automated policy mapping for GDPR, HIPAA, and DPDP frameworks.
        </p>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { name: 'GDPR', readiness: '94%', violations: 12, icon: Globe, status: 'Audit Ready' },
          { name: 'HIPAA', readiness: '88%', violations: 5, icon: Lock, status: 'In Compliance' },
          { name: 'DPDP', readiness: '92%', violations: 8, icon: FileText, status: 'Audit Ready' }
        ].map((framework) => (
          <div key={framework.name} className="glass-card rounded-[2.5rem] p-10 space-y-8 bg-slate-900/40 border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                <framework.icon className="h-7 w-7 text-white" />
              </div>
              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                {framework.status}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{framework.name} READINESS</p>
              <h3 className="text-6xl font-black text-white tracking-tighter">{framework.readiness}</h3>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Violations Prevented</p>
                  <p className="text-xl font-black text-white mt-1">{framework.violations}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trend</p>
                  <p className="text-xs font-black text-emerald-400 mt-1 flex items-center gap-1 justify-end">
                    <TrendingDown className="h-3 w-3" /> Improvement
                  </p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simplified Audit Integrity */}
      <div className="glass-card rounded-[2.5rem] p-10 bg-slate-900/40 border-white/5">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
               <h3 className="text-xl font-black text-white uppercase tracking-tight">Audit Log Integrity</h3>
               <p className="text-sm text-slate-400 max-w-xl">Every action, override, and decision is cryptographically hashed and stored in a tamper-proof audit trail for regulatory submission.</p>
            </div>
            <button className="px-8 py-4 rounded-2xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">
               Download Audit Report
            </button>
         </div>
      </div>
    </div>
  );
}
