import React, { useRef, useEffect } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  width?: 'fit-content' | '100%';
  delay?: number;
  duration?: number;
  yOffset?: number;
  staggerChildren?: number;
}

export const Reveal = ({ 
  children, 
  width = '100%', 
  delay = 0.2, 
  duration = 0.8,
  yOffset = 40,
  staggerChildren = 0
}: RevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const mainControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      mainControls.start('visible');
    }
  }, [isInView, mainControls]);

  return (
    <div ref={ref} style={{ position: 'relative', width, overflow: 'visible' }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: yOffset },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: {
              duration,
              delay,
              ease: [0.16, 1, 0.3, 1], // Cubic Out (Premium Snap)
              staggerChildren: staggerChildren
            }
          },
        }}
        initial="hidden"
        animate={mainControls}
      >
        {children}
      </motion.div>
    </div>
  );
};
