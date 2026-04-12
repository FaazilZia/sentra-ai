'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { siteContent } from '../../lib/content';
import { ArrowRight, Play } from 'lucide-react';
import { MagneticButton } from '../ui/MagneticButton';

import { use3DTilt } from '../../hooks/use3DTilt';

/**
 * HeroSection - Conversion Focused
 * Reduced visual noise, emphasizing clarity and readability.
 */
export const HeroSection = () => {
  const { hero } = siteContent;
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt(10);

  const headlineWords = hero.headline.split(" ");

  return (
    <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
      {/* Dynamic Background Accents - Cyan/Blue themed */}
      <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full" />
      
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[11px] font-bold mb-10 tracking-[0.2em] uppercase"
        >
          <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
          {hero.badgeText}
        </motion.div>
        
        <h1 className="text-5xl md:text-8xl font-bold text-white tracking-tight leading-[1.05] mb-8 max-w-5xl mx-auto flex flex-wrap justify-center gap-x-4">
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p 
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed"
        >
          {hero.subheadline}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <MagneticButton strength={20}>
            <Link to="/app">
              <button className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-black px-10 py-5 rounded-2xl transition-all shadow-xl shadow-cyan-900/30 hover:shadow-cyan-500/40 flex items-center gap-2 group text-sm uppercase tracking-[0.2em]">
                {hero.ctas.primary} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </MagneticButton>
          
          <button className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 text-white font-semibold hover:bg-white/5 transition-all flex items-center justify-center gap-2">
            <Play size={16} fill="white" /> {hero.ctas.secondary}
          </button>
        </motion.div>

        {/* 3D Parallax Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="w-full max-w-5xl mx-auto aspect-video rounded-2xl border border-cyan-500/20 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative group overflow-hidden"
          style={{ background: '#0a0e2e' }}
        >
               <div className="font-mono text-sm space-y-2 text-slate-300">
                 <div className="flex gap-3"><span className="text-cyan-400">import</span> <span className="text-white">{'{ Sentra }'}</span> <span className="text-cyan-400">from</span> <span className="text-emerald-400">"@sentra/sdk"</span>;</div>
                 <div>&nbsp;</div>
                 <div className="flex gap-3"><span className="text-slate-500">const</span> <span className="text-sky-300">sentra</span> = <span className="text-slate-500">new</span> <span className="text-cyan-300">Sentra</span>({'{'}</div>
                 <div className="flex gap-3 pl-6"><span className="text-sky-300">apiKey</span>: <span className="text-emerald-400">process.env.SENTRA_KEY</span>,</div>
                 <div className="flex gap-3 pl-6"><span className="text-sky-300">region</span>: <span className="text-emerald-400">'us-east-1'</span></div>
                 <div className="flex gap-3 text-slate-300">{'}'});</div>
                 <div>&nbsp;</div>
                 <div className="flex gap-3"><span className="text-cyan-400">await</span> <span className="text-sky-300">sentra</span>.<span className="text-cyan-300">secure</span>(prompt);</div>
               </div>
            
            {/* Floating UI Elements */}
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-10 right-10 p-4 glass-card border-none bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              SAFE_PIPELINE_ACTIVE
            </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
