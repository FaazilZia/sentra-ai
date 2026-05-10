'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number; // How far the button pulls
  distance?: number; // How far away the cursor starts pulling
}

/**
 * MagneticButton - A high-end interaction wrapper.
 * Uses weighted physics to pull the button towards the cursor.
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({ 
  children, 
  className,
  strength = 40,
  distance = 150
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Motion values for the transformation
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for high-end feel
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    // Calculate distance from center
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (dist < distance) {
      // Magnetic pull: stronger as you get closer to the center
      const power = (1 - dist / distance) * strength;
      x.set(deltaX * (power / 100));
      y.set(deltaY * (power / 100));
    } else {
      reset();
    }
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={{
        x: springX,
        y: springY,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default MagneticButton;
