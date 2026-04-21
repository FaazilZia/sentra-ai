import React from 'react';
import { UserCheck, Shield, Clock } from 'lucide-react';

interface DecisionOwnershipProps {
  approvedBy: string;
  role: string;
  timestamp: string;
}

export const DecisionOwnership: React.FC<DecisionOwnershipProps> = ({ 
  approvedBy, role, timestamp 
}) => {
  return (
    <div className="p-8 rounded-[2.5rem] bg-slate-900/40 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:border-white/10">
       <div className="flex items-center gap-6">
          <div className="h-14 w-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative">
             <UserCheck className="h-6 w-6 text-indigo-400" />
             <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center">
                <Shield className="h-3 w-3 text-emerald-500" />
             </div>
          </div>
          <div className="space-y-1">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attested By</p>
             <h4 className="text-xl font-black text-white tracking-tighter uppercase leading-none">
                {approvedBy}
             </h4>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-12">
          <div className="space-y-1">
             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ownership Role</p>
             <p className="text-sm font-black text-indigo-400 uppercase">{role}</p>
          </div>
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-slate-600" />
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Attestation Time</p>
             </div>
             <p className="text-sm font-black text-white uppercase">{timestamp}</p>
          </div>
       </div>

       <button className="px-6 py-3 rounded-xl bg-white/5 text-[9px] font-black text-slate-300 uppercase tracking-widest border border-white/5 hover:text-white hover:border-white/20 transition-all">
          View Audit Chain
       </button>
    </div>
  );
};
