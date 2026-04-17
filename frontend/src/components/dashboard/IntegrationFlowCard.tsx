import { Bot, ShieldCheck, Zap, Server } from 'lucide-react';

export const IntegrationFlowCard = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
      <div className="relative z-10">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-6">Seamless Governance Integration</h3>
        
        <div className="flex items-center justify-between gap-4">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
              <Bot className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Agent</span>
          </div>

          <div className="h-px flex-1 bg-slate-100 relative">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-200" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-200" />
            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-indigo-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Sentra AI</span>
          </div>

          <div className="h-px flex-1 bg-slate-100 relative">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-200" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-200" />
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
              <Server className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Decision</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-700">Zero Latency Interception</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">Sentra AI sits directly in the execution flow, ensuring every action is governed before it hits your external APIs or databases.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
