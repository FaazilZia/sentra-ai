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
import { cn } from '@/lib/utils';
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
        alert(`[Demo Mode] Action ${eventId} overridden by ${employeeId}`);
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
    <div className="flex flex-col h-full bg-slate-950 border border-white/5 rounded-3xl overflow-hidden">
      {!minimal && (
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-black tracking-[0.2em] text-slate-400 uppercase">
            Audit Activity Ledger
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onExport?.('csv')}
              className="px-6 py-2 rounded-xl bg-white text-[10px] font-black uppercase tracking-widest text-slate-950 hover:bg-slate-200 transition-all"
            >
              Export Archive
            </button>
          </div>
        </div>
      )}

      {/* Simplified Headers */}
      <div className="grid grid-cols-12 px-8 py-4 border-b border-white/5 bg-slate-900/20 text-[9px] font-black uppercase tracking-widest text-slate-600">
        <div className="col-span-1">Status</div>
        <div className="col-span-2">Agent</div>
        <div className="col-span-2">Action</div>
        <div className="col-span-1 text-center">Risk</div>
        <div className="col-span-4 px-4">Enforcement Result</div>
        <div className="col-span-2 text-right">Timestamp</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
             <div className="py-20 text-center text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
                No Activity Records Detected
             </div>
          ) : events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "border-b border-white/5 transition-all duration-200",
                selectedId === event.id ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"
              )}
            >
              <div
                className="grid grid-cols-12 px-8 py-6 items-center cursor-pointer group"
                onClick={() => setSelectedId(selectedId === event.id ? null : event.id)}
              >
                <div className="col-span-1">
                  {event.status === 'allowed' ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>

                <div className="col-span-2 text-xs font-black text-white uppercase tracking-tight truncate pr-4">
                  {event.agent}
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {event.action}
                  </span>
                </div>

                <div className="col-span-1 flex justify-center">
                  <span className={cn(
                    "text-[9px] font-black uppercase",
                    event.risk === 'high' ? 'text-rose-500' : event.risk === 'medium' ? 'text-amber-500' : 'text-slate-600'
                  )}>
                    {event.risk}
                  </span>
                </div>

                <div className="col-span-4 px-4 text-[11px] font-medium truncate">
                  {event.status === 'blocked' ? (
                    <span className="text-rose-500 font-bold uppercase text-[10px] tracking-tight">{event.reason}</span>
                  ) : (
                    <span className="text-slate-300">{event.impact || 'Verified Compliance Baseline'}</span>
                  )}
                </div>

                <div className="col-span-2 text-[10px] font-bold text-slate-600 text-right tabular-nums uppercase">
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
                    className="overflow-hidden bg-slate-900/10 border-t border-white/5"
                  >
                    <div className="p-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
                       <div className="space-y-8">
                          <div>
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4">Governance Context</h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                              {event.explanation || event.reason || "Action verified against internal security baseline and compliance mapping."}
                            </p>
                          </div>

                          {event.overriddenBy && (
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-3">Administrative Override</p>
                               <p className="text-xs text-white mb-4 font-bold italic">"{event.overrideComment}"</p>
                               <div className="flex items-center justify-between text-[9px] text-slate-600 font-black uppercase tracking-widest">
                                  <span>ID: {event.overriddenBy}</span>
                                  <span>Time: {event.timestamp}</span>
                                </div>
                            </div>
                          )}
                       </div>

                       <div className="space-y-8">
                          {(event.status === 'blocked' || event.isPendingApproval) && !event.overriddenBy && (
                            <div className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 space-y-6">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Manual Resolution</h4>
                               
                               <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Employee ID</label>
                                      <input 
                                          type="text" 
                                          value={employeeId}
                                          onChange={(e) => setEmployeeId(e.target.value)}
                                          placeholder="ID Required"
                                          className="w-full bg-transparent border-b border-white/10 py-2 text-xs text-white focus:outline-none focus:border-white"
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <button 
                                        onClick={() => handleOverride(event.id)}
                                        disabled={isOverriding}
                                        className="w-full py-3 rounded-xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                      >
                                        Approve Action
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Justification</label>
                                     <textarea 
                                        rows={2}
                                        value={overrideComment}
                                        onChange={(e) => setOverrideComment(e.target.value)}
                                        placeholder="Enter mandatory audit comment..."
                                        className="w-full bg-transparent border-b border-white/10 py-2 text-xs text-white focus:outline-none focus:border-white resize-none"
                                     />
                                  </div>
                               </div>
                            </div>
                          )}

                          <div className="flex gap-4">
                            <button
                              onClick={() => onReplay?.(event.id)}
                              className="flex-1 py-4 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                            >
                              Replay Trace
                            </button>
                            <button className="flex-1 py-4 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                               Examine Policy
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
