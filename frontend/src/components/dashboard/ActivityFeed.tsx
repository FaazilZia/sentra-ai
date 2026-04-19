import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Search,
  Database,
  Lock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { RiskIndicator } from './RiskIndicator';
import { apiRequest } from '../../lib/api';

export interface ActivityEvent {
  id: string;
  agent: string;
  action: string;
  status: 'allowed' | 'blocked';
  risk: 'low' | 'medium' | 'high';
  timestamp: string;
  reason?: string;
  impact?: string;
  compliance?: string[];
  explanation?: string;
  isPendingApproval?: boolean;
  overriddenBy?: string;
  overrideComment?: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  onReplay?: (id: string) => void;
  onExport?: (format: 'csv' | 'json') => void;
  minimal?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events, onReplay, onExport, minimal }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrideComment, setOverrideComment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  const handleOverride = async (eventId: string) => {
    if (!overrideComment || !employeeId) {
      alert("Please provide both a comment and Employee ID for the audit trail.");
      return;
    }
    setIsOverriding(true);
    try {
      if (eventId.startsWith('demo-')) {
        // Local simulation for demo mode
        alert(`[Demo Mode] Action ${eventId} overridden by ${employeeId}`);
        // In a real demo we'd update the state, but window.reload is used in real mode
        // For simplicity, we'll just mock the alert and success
      } else {
        await apiRequest(`/ai/override/${eventId}`, {
          method: 'POST',
          body: JSON.stringify({ comment: overrideComment, employeeId })
        });
      }
      alert("Action overridden and logged.");
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || "Override failed.");
    } finally {
      setIsOverriding(false);
    }
  };

  return (
    <div className="flex flex-col h-full glass-card rounded-[1.5rem] overflow-hidden border-white/5 bg-slate-900/20">
      {!minimal && (
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-400" />
              Activity Log Center
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport?.('csv')}
              className="px-4 py-2 rounded-xl bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700 transition-all"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Simplified Headers */}
      <div className="grid grid-cols-12 px-6 py-3 border-b border-white/5 bg-slate-950/40 text-[9px] font-black uppercase tracking-widest text-slate-500">
        <div className="col-span-1">Status</div>
        <div className="col-span-2">Agent</div>
        <div className="col-span-2">Action</div>
        <div className="col-span-1 text-center">Risk</div>
        <div className="col-span-1 text-center">Compliance</div>
        <div className="col-span-4 px-4">Result / Justification</div>
        <div className="col-span-1 text-right">Time</div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
             <div className="py-12 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                No activity records found
             </div>
          ) : events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "border-b border-white/5 transition-all duration-200",
                selectedId === event.id ? "bg-slate-800/40" : "hover:bg-white/[0.01]"
              )}
            >
              <div
                className="grid grid-cols-12 px-6 py-4 items-center cursor-pointer group"
                onClick={() => setSelectedId(selectedId === event.id ? null : event.id)}
              >
                <div className="col-span-1">
                  {event.isPendingApproval ? (
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                  ) : event.status === 'allowed' ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                  )}
                </div>

                <div className="col-span-2 text-xs font-bold text-slate-200 truncate pr-4">
                  {event.agent}
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {event.action}
                  </span>
                </div>

                <div className="col-span-1 flex justify-center">
                  <RiskIndicator level={event.risk} />
                </div>

                <div className="col-span-1 flex justify-center">
                  <span className="text-[9px] font-black text-indigo-400 uppercase">
                    {event.compliance?.[0] || '---'}
                  </span>
                </div>

                <div className="col-span-4 px-4 text-[11px] font-medium truncate">
                  {event.status === 'blocked' ? (
                    <span className="text-rose-400">{event.reason}</span>
                  ) : (
                    <span className="text-slate-400">{event.impact}</span>
                  )}
                </div>

                <div className="col-span-1 text-[10px] font-bold text-slate-600 text-right tabular-nums">
                  {event.timestamp}
                </div>
              </div>

              {/* Expansion Area */}
              <AnimatePresence>
                {selectedId === event.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-950/60 border-t border-white/5"
                  >
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                       <div className="space-y-6">
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Governance Insight</h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                              {event.explanation || event.reason || "Verified against internal security baseline."}
                            </p>
                          </div>

                          {event.overriddenBy && (
                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                               <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                  <ShieldCheck className="h-4 w-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Manual Override Approved</span>
                               </div>
                               <p className="text-xs text-slate-200 mb-2 font-medium italic">"{event.overrideComment}"</p>
                               <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase">
                                  <span>Approver: {event.overriddenBy}</span>
                                  <span>Timestamp: {event.timestamp}</span>
                               </div>
                            </div>
                          )}
                       </div>

                       <div className="space-y-6">
                          {(event.status === 'blocked' || event.isPendingApproval) && !event.overriddenBy && (
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                               <div className="flex items-center gap-2 text-white">
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  <h4 className="text-[10px] font-black uppercase tracking-widest">Manual Intervention</h4>
                               </div>
                               
                               <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-bold text-slate-500 uppercase">Employee ID</label>
                                      <input 
                                          type="text" 
                                          value={employeeId}
                                          onChange={(e) => setEmployeeId(e.target.value)}
                                          placeholder="EMP-XXXX"
                                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <button 
                                        onClick={() => handleOverride(event.id)}
                                        disabled={isOverriding}
                                        className="w-full py-2 rounded-lg bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                                      >
                                        {event.isPendingApproval ? 'Approve' : 'Override'}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                     <label className="text-[9px] font-bold text-slate-500 uppercase">Override Justification</label>
                                     <textarea 
                                        rows={2}
                                        value={overrideComment}
                                        onChange={(e) => setOverrideComment(e.target.value)}
                                        placeholder="Mandatory audit trail comment..."
                                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                                     />
                                  </div>
                               </div>
                               {event.risk === 'high' && (
                                  <p className="text-[8px] text-rose-400 font-bold uppercase tracking-tighter text-center pt-2">
                                    Admin review required for high-risk actions.
                                  </p>
                               )}
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={() => onReplay?.(event.id)}
                              className="flex-1 py-3 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                              <Database className="w-3 h-3" /> Replay Action
                            </button>
                            <button className="flex-1 py-3 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all flex items-center justify-center gap-2">
                               <Lock className="h-3 w-3" /> View Trace
                            </button>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
