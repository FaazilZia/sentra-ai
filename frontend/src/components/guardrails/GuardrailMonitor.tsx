import React, { useState, useEffect } from 'react';
import { ArrowRight, RefreshCcw } from 'lucide-react';
import { sendAIRequest, fetchGuardrailLogs, InterceptionLog, GuardrailMetrics, fetchGuardrailMetrics, requestGuardrailOverride } from '../../lib/api';
import { cn } from '@/lib/utils';

export function GuardrailMonitor() {
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<InterceptionLog[]>([]);
  const [metrics, setMetrics] = useState<GuardrailMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [logData, metricData] = await Promise.all([
        fetchGuardrailLogs(),
        fetchGuardrailMetrics()
      ]);
      setLogs(logData);
      setMetrics(metricData);
    } catch (err) {
      console.error('Failed to load guardrail data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsLoading(true);
    try {
      const result = await sendAIRequest(prompt);
      setLastResponse({ ...result, originalPrompt: prompt });
      loadData();
      setPrompt('');
    } catch (err: any) {
      setLastResponse({ success: false, decision: 'BLOCK', reason: 'Critical policy violation detected.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOverride = async () => {
    if (!lastResponse?.id || !overrideReason) return;
    try {
      await requestGuardrailOverride(lastResponse.id, overrideReason);
      setShowOverrideModal(false);
      setOverrideReason('');
      loadData();
    } catch (err) {
      console.error('Override request failed:', err);
    }
  };


  return (
    <div className="space-y-24">
      {/* Metrics Header */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Monitored</p>
              <h3 className="text-5xl font-black text-white">{metrics.total}</h3>
           </div>
           <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Allowed Actions</p>
              <h3 className="text-5xl font-black text-white">{metrics.allowed.toFixed(0)}%</h3>
           </div>
           <div className="space-y-1">
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Blocked Threats</p>
              <h3 className="text-5xl font-black text-white">{metrics.blocked.toFixed(0)}%</h3>
           </div>
           <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Data Redacted</p>
              <h3 className="text-5xl font-black text-white">{metrics.modified.toFixed(0)}%</h3>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
         {/* Real-time Sandbox */}
         <div className="space-y-12">
            <div className="space-y-3">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Enforcement Sandbox</h2>
               <p className="text-3xl font-black text-white tracking-tighter leading-tight">Test Policy Logic.</p>
            </div>

            <div className="space-y-8">
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                     <textarea 
                       value={prompt}
                       onChange={(e) => setPrompt(e.target.value)}
                       placeholder="Enter AI input to test guardrails..."
                       className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white transition-all min-h-[100px] resize-none"
                     />
                     <button 
                       disabled={isLoading}
                       className="absolute bottom-4 right-0 p-3 text-white hover:text-slate-400 transition-all disabled:opacity-50"
                     >
                        {isLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                     </button>
                  </div>
               </form>

               {lastResponse && (
                  <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 space-y-8 animate-in fade-in duration-500">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className={cn(
                             "h-2 w-2 rounded-full",
                             lastResponse.decision === 'BLOCK' ? 'bg-rose-500' : 'bg-emerald-500'
                           )} />
                           <span className="text-[10px] font-black uppercase tracking-widest text-white">Decision: {lastResponse.decision}</span>
                        </div>
                        {lastResponse.confidence && (
                           <span className="text-[9px] font-black text-slate-500 uppercase">{lastResponse.confidence} Confidence</span>
                        )}
                     </div>
                     
                     <div className="space-y-6">
                        {lastResponse.input && (
                           <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Input Analysis</p>
                              <p className="text-xs text-white leading-relaxed">{lastResponse.input}</p>
                           </div>
                        )}
                        {lastResponse.output && (
                           <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Enforcement Action</p>
                              <p className="text-xs text-emerald-400 font-mono bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">{lastResponse.output}</p>
                           </div>
                        )}
                        {lastResponse.message && (
                           <div className="flex flex-col gap-6 pt-4 border-t border-white/5">
                             <p className="text-xs text-rose-500 font-bold uppercase tracking-tight">{lastResponse.message}</p>
                             <button 
                               onClick={() => setShowOverrideModal(true)}
                               className="w-full py-4 rounded-2xl border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/5 transition-all"
                             >
                               Request Administrative Override
                             </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Admin Approvals & Logs */}
         <div className="space-y-12">
            <div className="space-y-3">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Activity Ledger</h2>
               <p className="text-3xl font-black text-white tracking-tighter leading-tight">Live Interceptions.</p>
            </div>

            <div className="space-y-4">
               {logs.slice(0, 8).map((log: InterceptionLog) => (
                  <div key={log.id} className="group py-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className={cn(
                           "h-1.5 w-1.5 rounded-full",
                           log.decision === 'BLOCK' ? 'bg-rose-500' : 'bg-emerald-500'
                        )} />
                        <div>
                           <p className="text-xs text-white font-black uppercase tracking-tight max-w-[200px] truncate">{log.input_text}</p>
                           <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-widest">
                             {log.decision} • {log.confidence} Confidence
                           </p>
                        </div>
                     </div>
                     <button className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-white transition-all">
                        View Trace →
                     </button>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="max-w-xl w-full space-y-12">
              <div className="text-center space-y-4">
                 <h3 className="text-4xl font-black text-white tracking-tighter uppercase">Request Override</h3>
                 <p className="text-slate-500 font-medium">Provide justification for bypassing this compliance block.</p>
              </div>
              <textarea 
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Business justification..."
                className="w-full bg-transparent border-b border-white/20 py-4 text-xl text-white focus:outline-none focus:border-white transition-all min-h-[150px] resize-none"
              />
              <div className="flex gap-6">
                 <button 
                   onClick={() => setShowOverrideModal(false)}
                   className="flex-1 py-5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest hover:bg-white/5 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleRequestOverride}
                   className="flex-1 py-5 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-2xl"
                 >
                   Submit for Review
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
