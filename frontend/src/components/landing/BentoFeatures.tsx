import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, BarChart3, Fingerprint, Network, Zap } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';

/**
 * BentoFeatures - Expanded feature showcase
 * 2x2 asymmetric grid highlighting specific advanced capabilities.
 */
export const BentoFeatures = () => {
  return (
    <section className="py-24 bg-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4"
          >
            Advanced Observability
          </motion.h2>
          <p className="text-slate-400 text-lg">Deep dive into Sentra AI's core capabilities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          {/* Large Card 1: Hallucination Detection */}
          <SpotlightCard
            className="md:col-span-2 p-8 relative group"
          >
            <ShieldAlert className="text-cyan-400 mb-6" size={32} />
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Real-time Hallucination Detection</h3>
            <p className="text-slate-400 max-w-sm">
              Instantly flag and block off-topic or hallucinated responses before they reach your users. Our semantic engine evaluates outputs in sub-millisecond time.
            </p>
            {/* Minimal visual payload */}
            <div className="absolute bottom-[-10px] right-[-10px] w-64 p-4 rounded-xl border border-cyan-800/20 bg-black/60 backdrop-blur-md shadow-2xl skew-y-3 group-hover:skew-y-0 transition-transform duration-500">
              <div className="text-[10px] text-cyan-400 font-mono mb-2">ALERT_TRIGGER: 0.98 Conf.</div>
              <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                <div className="h-full w-[98%] bg-cyan-500"></div>
              </div>
            </div>
          </SpotlightCard>

          {/* Small Card 1: PII Masking */}
          <SpotlightCard
            className="md:col-span-1 p-8 group flex flex-col"
          >
            <Fingerprint className="text-cyan-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">PII Auto-Masking</h3>
            <p className="text-slate-300 text-sm flex-grow">
              Automatically redact sensitive data like emails and credit cards from prompts on the fly.
            </p>
            <div className="mt-4 p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-xs text-slate-300 font-mono">
              "Contact me at <span className="bg-cyan-900/40 text-cyan-200 px-1 rounded">[REDACTED]</span>"
            </div>
          </SpotlightCard>

          {/* Small Card 2: Multi-LLM Support */}
          <SpotlightCard
            className="md:col-span-1 p-8 group"
          >
            <div className="flex items-center justify-between mb-6">
              <Zap className="text-cyan-400" size={32} />
              <div className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-tighter">
                High Performance
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Multi-LLM Support</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">One unified API for all leading foundation models.</p>
            
            <div className="flex flex-wrap gap-2">
              {['<10ms Latency', 'Auto-Scale', 'Edge Native'].map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          </SpotlightCard>

          {/* Large Card 2: Analytics */}
          <SpotlightCard
            className="md:col-span-2 p-8 relative group"
          >
            <div className="flex justify-between items-start">
              <div>
                <BarChart3 className="text-cyan-400 mb-6" size={32} />
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Token Usage Analytics</h3>
                <p className="text-slate-300 max-w-sm">
                  Granular cost tracking and latency monitoring across all environments. Know exactly how your models are performing.
                </p>
              </div>
              
              {/* Mini Bar Chart Graphic */}
              <div className="flex items-end gap-1.5 h-24 opacity-60 group-hover:opacity-100 transition-opacity">
                {[30, 50, 40, 70, 55, 90, 65].map((h, i) => (
                  <div key={i} className="w-8 bg-cyan-400/60 hover:bg-cyan-400 rounded-t-sm transition-colors duration-300" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </SpotlightCard>

        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
