'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie } from 'lucide-react';

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't accepted yet
    const hasConsented = localStorage.getItem('sentra_cookie_consent');
    if (!hasConsented) {
      // Slight delay so it doesn't pop up instantly on load
      const timeout = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timeout);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('sentra_cookie_consent', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[400px] z-[100] p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <Cookie className="text-pink-500 mt-0.5 shrink-0" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white mb-1">We use cookies</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sentra AI uses cookies to improve your experience and capture analytics. We do not use third-party tracking.
              </p>
            </div>
            <button onClick={() => setIsVisible(false)} className="text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={accept}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors text-sm uppercase tracking-wider"
            >
              Accept
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="flex-1 bg-transparent text-slate-300 border border-slate-700 text-xs font-semibold py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Essential Only
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
