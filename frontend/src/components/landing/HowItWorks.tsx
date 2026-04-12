'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { siteContent } from '../../lib/content';
import { ArrowRight } from 'lucide-react';

/**
 * HowItWorks - Step-by-Step Guide
 */
export const HowItWorks = () => {
  const { howItWorks } = siteContent;

  return (
    <section id="how-it-works" className="py-24 bg-transparent border-t border-slate-800/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-6"
          >
            The Process
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          >
            Deploy in three steps.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Animated Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] -z-10 overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
              className="h-full w-full origin-left"
              style={{
                background: 'linear-gradient(90deg, #00F5FF 0%, #3563E9 50%, #00F5FF 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          {howItWorks.steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="p-10 glass-card group transition-all duration-500 flex flex-col items-center text-center"
            >
              {/* Numbered Circle */}
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-full bg-cyan-600/15 border-2 border-cyan-500/40 flex items-center justify-center group-hover:bg-cyan-600 group-hover:border-cyan-400 transition-all duration-500 shadow-[0_0_25px_rgba(0,245,255,0.15)]">
                  <span className="text-xl font-black text-cyan-400 group-hover:text-white transition-colors duration-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                {i < howItWorks.steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 left-[calc(100%+8px)] items-center">
                    <ArrowRight size={16} className="text-cyan-600/40" />
                  </div>
                )}
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/70 mb-2">Step {String(i + 1).padStart(2, '0')}</div>
              <h3 className="text-xl font-bold text-white mb-4 tracking-tight uppercase">
                {step.title}
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-[260px]">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
