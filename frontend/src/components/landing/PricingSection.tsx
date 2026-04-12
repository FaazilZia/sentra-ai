'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { siteContent } from '../../lib/content';
import { Check } from 'lucide-react';

/**
 * PricingSection - Monthly/Yearly Toggle
 * Highlights the 'Pro' tier for optimized conversion.
 */
export const PricingSection = () => {
  const { pricing } = siteContent;
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="pricing" className="py-24 bg-transparent border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-8">
            {pricing.heading}
          </h2>
          
          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={billingCycle === 'monthly' ? 'text-white font-bold' : 'text-slate-400 font-medium'}>Monthly</span>
            <button 
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 rounded-full bg-slate-800 p-1 transition-all duration-300 border border-slate-700 hover:border-blue-500/50"
            >
              <motion.div 
                animate={{ x: billingCycle === 'monthly' ? 0 : 28 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-5 h-5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(168,127,251,0.5)]"
              />
            </button>
            <span className={billingCycle === 'yearly' ? 'text-white font-bold' : 'text-slate-400 font-medium'}>
              Yearly <span className="ml-1 text-[10px] text-green-400 font-black uppercase bg-green-400/10 px-1.5 py-0.5 rounded">Save 25%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricing.tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-3xl border ${
                tier.highlighted 
                ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_80px_rgba(168,127,251,0.1)]' 
                : 'border-slate-800 bg-slate-900/40'
              } flex flex-col h-full overflow-hidden`}
            >
              {tier.highlighted && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-[10px] font-black uppercase rounded-full tracking-widest text-white shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-slate-400 text-sm">{tier.desc}</p>
              </div>

              <div className="mb-10 flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span 
                    key={billingCycle}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-4xl font-bold text-white"
                  >
                    {tier.price[billingCycle] === "Custom" ? "" : "$"}
                    {tier.price[billingCycle]}
                  </motion.span>
                </AnimatePresence>
                {tier.price[billingCycle] !== "Custom" && <span className="text-slate-500 text-sm font-medium">/mo</span>}
              </div>

              <div className="space-y-4 mb-10 flex-grow">
                {tier.features.map(feature => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${tier.highlighted ? 'bg-blue-600' : 'bg-slate-800'}`}>
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                    <span className="text-slate-300 text-sm leading-none">{feature}</span>
                  </div>
                ))}
              </div>

              <button className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                tier.highlighted 
                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20' 
                : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}>
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
