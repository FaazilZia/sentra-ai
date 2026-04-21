import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreloaderProps {
  onComplete: () => void;
}

const loadingTexts = [
  "INITIALIZING NEURAL NETS...",
  "LOCATING VULNERABILITIES...",
  "SECURING KNOWLEDGE GRAPH...",
  "DEPLOYING SENTRA AI CORE...",
];

const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Fake progress loading simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoaded(true), 500); // Small pause at 100%
          return 100;
        }
        // Random variable jump between 1 and 8
        const jump = Math.floor(Math.random() * 8) + 1;
        return Math.min(prev + jump, 100);
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Cycle text based on progress thresholds
    if (progress > 25 && textIndex === 0) setTextIndex(1);
    if (progress > 50 && textIndex === 1) setTextIndex(2);
    if (progress > 85 && textIndex === 2) setTextIndex(3);
  }, [progress, textIndex]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!isLoaded && (
        <motion.div
          key="preloader"
          initial={{ y: 0 }}
          exit={{ 
            y: '-100vh',
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } 
          }}
          className="fixed inset-0 z-[9999] flex flex-col justify-end p-8 md:p-16 bg-[#03030a] text-white overflow-hidden"
        >
          <div className="flex flex-col md:flex-row justify-between items-end w-full">
            <div className="overflow-hidden mb-8 md:mb-0">
              <motion.div
                key={textIndex}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-xs tracking-[0.2em] md:text-sm font-semibold text-slate-300"
              >
                {loadingTexts[textIndex]}
              </motion.div>
            </div>

            <div className="text-[12vw] md:text-[8vw] font-black leading-none tracking-tighter tabular-nums">
              {progress}%
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-800">
            <motion.div 
              className="h-full bg-cyan-400 shadow-[0_0_15px_rgba(168,127,251,0.5)]"
              style={{ width: `${progress}%` }}
              layout
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
