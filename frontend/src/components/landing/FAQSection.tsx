'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { siteContent } from '../../lib/content';

export const FAQSection = () => {
  const { faq } = siteContent;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section className="py-24 bg-transparent border-t border-slate-800/30">
      <div className="max-w-3xl mx-auto px-6">
        {/* Label */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
            <HelpCircle size={11} /> FAQ
          </div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold text-center text-white tracking-tight mb-16"
        >
          {faq.heading}
        </motion.h2>

        <div className="space-y-3">
          {faq.items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                  isOpen
                    ? 'border-l-4 border-l-cyan-500 border border-cyan-500/20 bg-[#0b1035]'
                    : 'border border-slate-700/40 bg-[#0b1035]/60 hover:border-cyan-500/20'
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                >
                  <span className={`font-semibold text-base transition-colors ${isOpen ? 'text-white' : 'text-slate-200'}`}>
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className={`transition-colors ${isOpen ? 'text-cyan-400' : 'text-slate-500'}`} size={20} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 text-slate-300 text-sm leading-relaxed border-t border-cyan-500/10 pt-4">
                        {item.a || item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
