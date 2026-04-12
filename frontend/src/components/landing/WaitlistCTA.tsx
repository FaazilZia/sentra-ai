'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';

export const WaitlistCTA = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert(`Waitlist joined: ${email}`);
      setEmail('');
    }
  };

  return (
    <section className="py-24 bg-transparent relative overflow-hidden flex justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-600/5 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full max-w-2xl px-6 relative z-10"
      >
        <div className="p-10 md:p-14 rounded-[2.5rem] border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl shadow-[0_0_80px_rgba(0,245,255,0.05)] text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
            Get early access to new features
          </h2>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">
            Experience the future of secure AI deployment. Join our priority waitlist.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-md mx-auto gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                className="w-full bg-slate-900 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-sm"
              />
            </div>
            <button 
              type="submit"
              className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-900/20 whitespace-nowrap flex items-center justify-center gap-2"
            >
              Join Waitlist <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
};

export default WaitlistCTA;
