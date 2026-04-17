import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const BeforeAfterPanel = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">The Sentra Advantage</h3>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Value Comparison</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Before */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Before Sentra</span>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-900 font-medium leading-relaxed">
                AI Agent attempts to export customer PII to an external API.
              </p>
            </div>
            <div className="flex items-center justify-center py-2 text-red-400">
              <ArrowRight className="w-4 h-4 rotate-90 md:rotate-0" />
            </div>
            <div className="p-3 bg-red-600 rounded-xl text-center">
              <p className="text-xs text-white font-bold uppercase tracking-tight">Data Leak & GDPR Fine</p>
            </div>
          </div>
        </div>

        {/* After */}
        <div className="p-6 bg-slate-50/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">With Sentra AI</span>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <p className="text-xs text-indigo-900 font-medium leading-relaxed">
                AI Agent attempts same action. Sentra Interceptor triggers.
              </p>
            </div>
            <div className="flex items-center justify-center py-2 text-green-400">
              <ArrowRight className="w-4 h-4 rotate-90 md:rotate-0" />
            </div>
            <div className="p-3 bg-green-600 rounded-xl text-center shadow-lg shadow-green-100">
              <p className="text-xs text-white font-bold uppercase tracking-tight">Action Blocked & Logged</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-indigo-900 text-white text-center">
        <p className="text-[11px] font-medium leading-relaxed opacity-90">
          Sentra AI converts technical security into business continuity. 
          <span className="font-bold ml-1 text-indigo-300 underline underline-offset-4 decoration-indigo-500/50 cursor-pointer">Learn more about ROI →</span>
        </p>
      </div>
    </div>
  );
};
