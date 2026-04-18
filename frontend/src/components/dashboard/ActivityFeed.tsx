import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Info, 
  Search,
  ChevronRight,
  Database,
  Lock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { RiskIndicator } from './RiskIndicator';
import { ActionTimeline } from './ActionTimeline';

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
  confidence?: number;
  timeline?: string[];
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  onReplay?: (id: string) => void;
  onExport?: (format: 'csv' | 'json') => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events, onReplay, onExport }) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col h-full glass-card rounded-[2rem] overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-400" />
            Live Governance Feed
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Real-time AI action interception & decision log</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => onExport?.('json')}
             className="px-3 py-1.5 rounded-lg bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:bg-slate-700 transition-colors"
           >
             Export JSON
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "group relative rounded-2xl border transition-all duration-300",
                selectedId === event.id 
                  ? "bg-slate-800/80 border-indigo-500/30 ring-1 ring-indigo-500/20" 
                  : "bg-slate-900/40 border-white/5 hover:bg-slate-800/40 hover:border-white/10"
              )}
            >
              <div 
                className="p-4 cursor-pointer flex items-center gap-4"
                onClick={() => setSelectedId(selectedId === event.id ? null : event.id)}
              >
                <div className={cn(
                  "p-2.5 rounded-xl shadow-lg",
                  event.status === 'allowed' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {event.status === 'allowed' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-100 truncate">{event.agent}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {event.action}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.timestamp}
                    </span>
                    <RiskIndicator level={event.risk} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <ChevronRight className={cn(
                     "w-4 h-4 text-slate-600 transition-transform duration-300",
                     selectedId === event.id && "rotate-90 text-indigo-400"
                   )} />
                </div>
              </div>

              <AnimatePresence>
                {selectedId === event.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900/60">
                      <div className="md:col-span-7 space-y-4">
                        {event.status === 'blocked' && (
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2 flex items-center gap-2">
                                <ShieldAlert className="w-3 h-3" />
                                Rejection Logic
                              </h4>
                              <p className="text-sm text-slate-300 font-medium">{event.reason}</p>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Business Impact
                              </h4>
                              <p className="text-sm text-slate-300 font-medium">{event.impact}</p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                              {event.compliance?.map(tag => (
                                <span key={tag} className="px-2 py-1 rounded-md bg-slate-800 border border-white/5 text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                  <Lock className="w-3 h-3 text-indigo-400" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {event.status === 'allowed' && (
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-sm text-slate-300">{event.explanation || 'Action verified against global security baseline. No violations detected.'}</p>
                          </div>
                        )}
                        
                        <div className="pt-4 flex items-center gap-3">
                           <button 
                             onClick={() => onReplay?.(event.id)}
                             className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
                           >
                             <Database className="w-3.5 h-3.5" />
                             Re-run Simulation
                           </button>
                        </div>
                      </div>

                      <div className="md:col-span-5 border-l border-white/5 pl-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Action Timeline</h4>
                        <ActionTimeline status={event.status} risk={event.risk} />
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
