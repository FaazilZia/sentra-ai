import React from 'react';
import { motion } from 'framer-motion';
import { siteContent } from '../../lib/content';
import { Lock, ShieldCheck, Globe } from 'lucide-react';

/**
 * SecuritySection - Enterprise Grade Trust
 * Focuses on compliance and data safety with clean badges.
 */
export const SecuritySection = () => {
  const { security } = siteContent;

  const securityIcons = [ShieldCheck, Lock, Globe];

  return (
    <section id="security" className="py-24 bg-transparent relative overflow-hidden">
      {/* Dynamic Security Beams - Now Cyan/Blue */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="flex flex-col items-center justify-center text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-4"
          >
            <Lock size={12} /> Military Grade Security
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4"
          >
            {security.heading}
          </motion.h2>
          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            Our multi-layered security architecture ensures your model outputs are safe, compliant, and cost-effective.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-8 max-w-3xl mx-auto relative">
          {security.items.map((item, idx) => {
            const Icon = securityIcons[idx] || ShieldCheck;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="w-full md:w-72 p-8 flex flex-col items-center text-center group glass-card hover:bg-royal-600/20 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-500 shadow-[0_0_30px_rgba(0,245,255,0.15)]">
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
