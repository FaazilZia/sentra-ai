'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { siteContent } from '../../lib/content';
import { ArrowRight } from 'lucide-react';

/**
 * FinalCTA - Strong Call to Action
 * Clean focus on the primary user conversion path.
 */
export const FinalCTA = () => {
  const { cta } = siteContent;

  return (
    <section className="py-32 bg-transparent relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative glass-card p-12 md:p-20 overflow-hidden text-center border-none"
        >
          {/* Pulsing Cyan Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full animate-pulse" />
          
          <h2 className="text-4xl md:text-7xl font-bold text-white mb-8 tracking-tighter leading-[1.1]">
            Ready to secure your <br /> <span className="text-cyan-500 italic">AI presence?</span>
          </h2>
          
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12">
            Join the elite teams building with Sentra. Deployment takes minutes, protection lasts a lifetime.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-black px-12 py-5 rounded-2xl transition-all shadow-xl shadow-cyan-900/30 hover:shadow-cyan-500/40 flex items-center justify-center gap-3 group text-lg uppercase tracking-[0.2em]">
              Start Building Now <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="text-sm text-slate-500 font-medium mt-8">
            No credit card required. Start free.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
