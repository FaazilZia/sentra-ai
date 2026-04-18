import React from 'react';
import { ShieldAlert, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface BlockedAction {
  id: string;
  agent: string;
  action: string;
  severity: 'critical' | 'high';
  reason: string;
}

interface BlockedActionsPanelProps {
  actions: BlockedAction[];
}

export const BlockedActionsPanel: React.FC<BlockedActionsPanelProps> = ({ actions }) => {
  return (
    <div className="glass-card rounded-[2rem] p-6 border-rose-500/20 glow-red h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Red Alert Zone
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Critical Policy Violations</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
      </div>

      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center opacity-40">
            <AlertTriangle className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">No Critical Threats</p>
          </div>
        ) : (
          actions.map((action, index) => (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={action.id}
              className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{action.agent}</p>
                    <p className="text-[10px] text-rose-500/80 font-mono">{action.action}</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-rose-500 transition-colors" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      <button className="w-full mt-6 py-2.5 rounded-xl border border-rose-500/20 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/5 transition-all">
        View All Blocks
      </button>
    </div>
  );
};
