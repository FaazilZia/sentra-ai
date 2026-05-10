import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';

const NeuralCore = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track mouse position specifically for the core
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Buttery physics for the mouse tracking
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20, mass: 1 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20, mass: 1 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates from -1 to 1 based on window center
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x * 100); // Max travel distance: 100px
      mouseY.set(y * 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Hook into scroll to make the core perform actions as you scroll
  const { scrollY } = useScroll();
  
  // As user scrolls down, the core drops down slightly, scales down, and fades into the background
  const coreScale = useTransform(scrollY, [0, 800], [1, 0.6]);
  const coreYOffset = useTransform(scrollY, [0, 800], [0, 300]);
  const coreOpacity = useTransform(scrollY, [0, 800], [1, 0.4]);

  return (
    <motion.div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[-1] flex items-center justify-center overflow-hidden"
      style={{
        scale: coreScale,
        y: coreYOffset,
        opacity: coreOpacity,
      }}
    >
      <motion.div
        className="relative w-[50vh] h-[50vh] md:w-[60vh] md:h-[60vh]"
        style={{
          x: springX,
          y: springY,
        }}
      >
        {/* Core Layers */}
        
        {/* Deep background ambient glow */}
        <motion.div 
          className="absolute inset-0 rounded-full bg-cyan-600/20 blur-[100px]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
        
        {/* Off-center spinning ring 1 */}
        <motion.div 
          className="absolute inset-0 rounded-full border border-cyan-400/30 shadow-[0_0_50px_rgba(0,245,255,0.2)]"
          style={{ rotateX: 60, rotateY: 20 }}
          animate={{ rotateZ: 360 }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity }}
        />
        
        {/* Off-center spinning ring 2 */}
        <motion.div 
          className="absolute inset-4 rounded-full border border-cyan-500/40 shadow-[0_0_40px_rgba(0,245,255,0.3)]"
          style={{ rotateX: 30, rotateY: 70 }}
          animate={{ rotateZ: -360 }}
          transition={{ duration: 25, ease: "linear", repeat: Infinity }}
        />

        {/* Central Dense Node */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-tr from-pink-400 to-rose-600 blur-[8px]"
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
        />
        
        {/* Inner intense bright light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white blur-[4px] shadow-[0_0_100px_rgba(255,255,255,1)]" />

        {/* Floating abstract particles orbiting the core */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-pink-300 shadow-[0_0_10px_rgba(244,114,182,0.8)]"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              top: '50%',
              left: '50%',
            }}
            animate={{
              x: [
                Math.random() * 300 - 150, 
                Math.random() * 300 - 150, 
                Math.random() * 300 - 150
              ],
              y: [
                Math.random() * 300 - 150, 
                Math.random() * 300 - 150, 
                Math.random() * 300 - 150
              ],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "mirror"
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default NeuralCore;
