'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { siteContent } from '../../lib/content';

export const FooterSection = () => {
  const { footer } = siteContent;

  return (
    <footer className="py-16 bg-transparent border-t border-slate-800/50 relative z-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-3 group cursor-pointer mb-6">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 rounded-full overflow-hidden shadow-[0_8px_20px_rgba(0,245,255,0.3)]"
              >
                <img src="/logo-s.png" alt="Sentra AI Logo" className="w-full h-full object-cover" />
              </motion.div>
              <span className="text-2xl font-black text-gradient-purple tracking-tighter uppercase drop-shadow-md">
                {siteContent.nav.logo}
              </span>
            </div>
            <p className="text-slate-300 max-w-sm mb-8 leading-relaxed">
              {footer.description}
            </p>
            <div className="flex flex-col gap-3">
              {footer.socials.map((link) => (
                <a 
                  key={link.label}
                  href={link.href} 
                  className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 group/link w-fit"
                >
                  {link.label}
                  <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                </a>
              ))}
            </div>
          </div>
          
          {footer.columns.map(col => (
            <div key={col.title}>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-[11px]">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map(link => (
                  <li key={link.label}>
                    <a href={link.href} className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] font-semibold text-slate-400">
          <p>{footer.copyright}</p>
          <div className="flex gap-6">
             <span className="flex items-center gap-2 relative">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               All systems operational
             </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
