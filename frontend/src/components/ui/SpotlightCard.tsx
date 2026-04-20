'use client';

import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  onClick?: () => void;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({ 
  children, 
  className,
  spotlightColor = "rgba(242, 38, 125, 0.15)",
  onClick
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for high-end track
  const springX = useSpring(mouseX, { stiffness: 500, damping: 50 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 50 });

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`
    radial-gradient(
      650px circle at ${springX}px ${springY}px,
      ${spotlightColor},
      transparent 80%
    )
  `;

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-cyan-500/20 transition-all duration-300 hover:border-cyan-400/40 hover:-translate-y-1",
        className
      )}
      style={{ background: '#0b1035', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[1.5rem] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background,
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
