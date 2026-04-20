import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Lock, ArrowRight, RefreshCcw, Activity, Check, X, TrendingUp } from 'lucide-react';
import { sendAIRequest, fetchGuardrailLogs, InterceptionLog, GuardrailMetrics, fetchGuardrailMetrics, fetchGuardrailOverrides, GuardrailOverride, approveGuardrailOverride, requestGuardrailOverride } from '../../lib/api';

import { SurfaceCard } from '../ui/SurfaceCard';
import { Reveal } from '../ui/Reveal';

export function GuardrailMonitor() {
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<InterceptionLog[]>([]);
  const [metrics, setMetrics] = useState<GuardrailMetrics | null>(null);
  const [overrides, setOverrides] = useState<GuardrailOverride[]>([]);
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
      const [logData, metricData, overrideData] = await Promise.all([
        fetchGuardrailLogs(),
        fetchGuardrailMetrics(),
        fetchGuardrailOverrides()
      ]);
      setLogs(logData);
      setMetrics(metricData);
      setOverrides(overrideData);
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

  const handleApproveOverride = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await approveGuardrailOverride(id, status);
      loadData();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  return (
    <div className="space-y-12">
      {/* Metrics Header */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Interceptions</p>
              <h3 className="text-3xl font-black text-white">{metrics.total}</h3>
           </div>
           <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 space-y-2">
              <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Allowed</p>
              <h3 className="text-3xl font-black text-emerald-400">{metrics.allowed.toFixed(1)}%</h3>
           </div>
           <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6 space-y-2">
              <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest">Blocked</p>
              <h3 className="text-3xl font-black text-rose-400">{metrics.blocked.toFixed(1)}%</h3>
           </div>
           <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-6 space-y-2">
              <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest">Modified</p>
              <h3 className="text-3xl font-black text-orange-400">{metrics.modified.toFixed(1)}%</h3>
           </div>
        </div>
      )}

      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
           {/* Real-time Sandbox */}
           <div className="space-y-6">
              <div className="space-y-2">
                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <Shield className="h-6 w-6 text-emerald-400" />
                    Guardrail Sandbox
                 </h2>
                 <p className="text-slate-400 text-sm font-medium">Test real-time PII/PHI redaction and prompt injection blocking.</p>
              </div>

              <SurfaceCard title="Guardrail Sandbox" className="bg-slate-900/60 p-8 space-y-6">
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                       <textarea 
                         value={prompt}
                         onChange={(e) => setPrompt(e.target.value)}
                         placeholder="Type a sensitive prompt (e.g. 'Show me john@secret.com medical diagnosis')"
                         className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[120px] transition-all"
                       />
                       <button 
                         disabled={isLoading}
                         className="absolute bottom-4 right-4 p-3 bg-white text-slate-950 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
                       >
                          {isLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                       </button>
                    </div>
                 </form>

                 {lastResponse && (
                    <div className={`p-6 rounded-2xl border animate-in fade-in slide-in-from-top-4 duration-500 ${
                       lastResponse.decision === 'BLOCK' ? 'bg-rose-500/10 border-rose-500/20' :
                       lastResponse.decision === 'MODIFY' ? 'bg-orange-500/10 border-orange-500/20' :
                       'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                             {lastResponse.decision === 'BLOCK' ? <ShieldAlert className="h-4 w-4 text-rose-400" /> :
                              lastResponse.decision === 'MODIFY' ? <Lock className="h-4 w-4 text-orange-400" /> :
                              <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                             <span className="text-[10px] font-black uppercase tracking-widest text-white">Decision: {lastResponse.decision}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             {lastResponse.confidence && (
                               <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                 lastResponse.confidence === 'High' ? 'bg-emerald-500/20 text-emerald-400' :
                                 lastResponse.confidence === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                                 'bg-rose-500/20 text-rose-400'
                               }`}>
                                 {lastResponse.confidence} Confidence
                               </div>
                             )}
                             {lastResponse.policy_triggered && (
                               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Policy: {lastResponse.policy_triggered}</span>
                             )}
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          {lastResponse.input && (
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase">Processed Input</p>
                                <p className="text-xs text-white bg-slate-950/50 p-2 rounded-lg border border-white/5">{lastResponse.input}</p>
                             </div>
                          )}
                          {lastResponse.output && (
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase">Enforced Output</p>
                                <p className="text-xs text-white bg-slate-950/50 p-2 rounded-lg border border-white/5 font-mono">{lastResponse.output}</p>
                             </div>
                          )}
                          {lastResponse.message && (
                             <div className="flex items-center justify-between">
                               <p className="text-xs text-rose-400 font-bold">{lastResponse.message}</p>
                               <button 
                                 onClick={() => setShowOverrideModal(true)}
                                 className="text-[10px] font-black text-white uppercase bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all"
                               >
                                 Request Override
                               </button>
                             </div>
                          )}
                       </div>
                    </div>
                 )}
              </SurfaceCard>
           </div>

           {/* Admin Approvals & Logs */}
           <div className="space-y-8">
              {/* Approvals Panel */}
              {overrides.some((o: GuardrailOverride) => o.status === 'pending') && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                   <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Pending Approvals
                   </h3>
                   <div className="space-y-3">
                      {overrides.filter((o: GuardrailOverride) => o.status === 'pending').map((override: GuardrailOverride) => (
                         <div key={override.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center group">
                            <div className="space-y-1">
                               <p className="text-[11px] text-white font-bold">{override.reason}</p>
                               <p className="text-[9px] text-slate-500 uppercase font-black">Requested by User ID: {override.requested_by.slice(0, 8)}</p>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => handleApproveOverride(override.id, 'approved')}
                                 className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-all"
                               >
                                  <Check className="h-4 w-4" />
                               </button>
                               <button 
                                 onClick={() => handleApproveOverride(override.id, 'rejected')}
                                 className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500/20 transition-all"
                               >
                                  <X className="h-4 w-4" />
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                          <Activity className="h-6 w-6 text-cyan-400" />
                          Interception Log
                       </h2>
                    </div>
                 </div>

                 <div className="space-y-3">
                    {logs.map((log: InterceptionLog) => (
                       <div key={log.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 hover:bg-slate-900/60 transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                                log.decision === 'BLOCK' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                log.decision === 'MODIFY' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                             }`}>
                                {log.decision === 'BLOCK' ? <ShieldAlert className="h-5 w-5" /> :
                                 log.decision === 'MODIFY' ? <Lock className="h-5 w-5" /> :
                                 <ShieldCheck className="h-5 w-5" />}
                             </div>
                             <div>
                                <p className="text-xs text-white font-bold max-w-[150px] truncate">{log.input_text}</p>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                      log.confidence === 'High' ? 'bg-emerald-500/10 text-emerald-400' :
                                      log.confidence === 'Medium' ? 'bg-orange-500/10 text-orange-400' :
                                      'bg-rose-500/10 text-rose-400'
                                   }`}>{log.confidence} Conf.</span>
                                   {log.override_status !== 'none' && (
                                     <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                       log.override_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                                       log.override_status === 'pending' ? 'bg-cyan-500/10 text-cyan-400' :
                                       'bg-rose-500/10 text-rose-400'
                                     }`}>{log.override_status}</span>
                                   )}
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className={`text-[10px] font-black uppercase tracking-widest ${
                                log.decision === 'BLOCK' ? 'text-rose-400' :
                                log.decision === 'MODIFY' ? 'text-orange-400' :
                                'text-emerald-400'
                             }`}>
                                {log.decision}
                             </span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </Reveal>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-lg w-full space-y-6 shadow-2xl">
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Request Override</h3>
                 <p className="text-slate-400 text-sm font-medium">Explain why this compliance block should be bypassed for this specific request.</p>
              </div>
              <textarea 
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Business justification (e.g., 'Testing with dummy data')"
                className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm text-white min-h-[120px]"
              />
              <div className="flex gap-4">
                 <button 
                   onClick={() => setShowOverrideModal(false)}
                   className="flex-1 py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest hover:bg-white/5 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleRequestOverride}
                   className="flex-1 py-4 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                   Submit Request
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
