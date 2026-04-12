'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, Lock, BarChart3 } from 'lucide-react';

/**
 * ProductPreview - Minimalist Mock Dashboard
 * Focuses on illustrating product value through clean UI composition.
 */
export const ProductPreview = () => {
  return (
    <section className="py-20 overflow-hidden bg-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative">
          {/* Main Dashboard Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl aspect-video md:aspect-[21/9] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header bar */}
            <div className="h-12 border-b border-slate-800 flex items-center px-4 gap-3 bg-slate-800/30">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-900 border border-slate-700 rounded px-3 py-0.5 text-[10px] text-slate-500 font-mono">
                  app.sentra.ai/dashboard/observability
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 flex gap-6">
              <div className="w-1/4 hidden md:flex flex-col gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-4 w-full bg-slate-800/40 rounded shadow-sm" />
                ))}
              </div>
              <div className="flex-1 bg-slate-800/20 rounded-xl border border-slate-700/30 p-8 flex flex-col justify-end gap-4 overflow-hidden">
                <div className="flex justify-between items-end h-32 gap-2">
                  {[40, 70, 45, 90, 65, 80, 50, 100, 75, 60, 85, 55, 95, 70, 40].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: i * 0.05 }}
                      className="flex-1 bg-blue-600/60 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating UI Cards */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="hidden lg:block absolute top-[10%] -left-12 w-64 p-6 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl z-20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <Shield size={18} />
              </div>
              <span className="text-xs font-bold text-slate-300">Pill Injection Blocked</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-[85%] bg-red-500"></div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="hidden lg:block absolute bottom-[15%] -right-12 w-64 p-6 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl z-20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Activity size={18} />
              </div>
              <span className="text-xs font-bold text-slate-300">System Latency: 12ms</span>
            </div>
            <div className="flex gap-1 h-8 items-end">
              {[1, 2, 3, 2, 4, 3, 5].map((v, i) => (
                <div key={i} className="flex-1 bg-blue-500/40 rounded-sm" style={{ height: `${v * 20}%` }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProductPreview;
