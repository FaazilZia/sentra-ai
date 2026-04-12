import React, { useCallback, useEffect, useRef, useState } from 'react';

interface AtomProps {
  size: number;
  top: string;
  left: string;
  rings: number;
  speedMultiplier: number;
  angle: number;
}

const Atom: React.FC<AtomProps> = ({ size, top, left, rings, speedMultiplier, angle }) => {
  const floatDuration = 6 + speedMultiplier * 4;
  return (
    <div
      className="absolute flex items-center justify-center pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        transform: `rotate(${angle}deg)`,
        animation: `atom-float ${floatDuration}s ease-in-out infinite`,
      }}
    >
      {/* Nucleus */}
      <div
        className="absolute bg-black rounded-full shadow-[0_0_15px_rgba(0,0,0,0.2)]"
        style={{
          width: size * 0.15,
          height: size * 0.15,
        }}
      />

      {/* Rings & Electrons */}
      {[...Array(rings)].map((_, i) => {
        const rotationSpeed = (10 + (i * 5)) / speedMultiplier;
        const tilt = i * 60; // Spread rings

        return (
          <div
            key={i}
            className="absolute rounded-full border border-black/20"
            style={{
              width: '100%',
              height: '40%', // Elliptical look
              transform: `rotate(${tilt}deg)`,
            }}
          >
            {/* Orbiting Electron */}
            <div
              className="absolute bg-black rounded-full"
              style={{
                width: size * 0.05,
                height: size * 0.05,
                left: '-2.5%',
                top: '50%',
                marginTop: -(size * 0.025),
                animation: `orbit ${rotationSpeed}s linear infinite`,
                transformOrigin: `${size * 0.5 + size * 0.0125}px 50%`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const AtomBackground: React.FC = () => {
  const [atoms, setAtoms] = useState<AtomProps[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const atomCount = Math.floor(Math.random() * 4) + 5; // 5-8 atoms
    const newAtoms: AtomProps[] = [];

    for (let i = 0; i < atomCount; i++) {
      newAtoms.push({
        size: Math.floor(Math.random() * 100) + 60, // 60px - 160px
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        rings: Math.floor(Math.random() * 2) + 2, // 2-3 rings
        speedMultiplier: 0.5 + Math.random(),
        angle: Math.random() * 360,
      });
    }

    setAtoms(newAtoms);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollY = window.scrollY;
    const blur = Math.min(scrollY / 80, 6); // max 6px blur
    const opacity = Math.max(1 - scrollY / 800, 0.15); // fade to 0.15
    containerRef.current.style.filter = `blur(${blur}px)`;
    containerRef.current.style.opacity = String(opacity);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden pointer-events-none transition-[filter,opacity] duration-200">
      {atoms.map((atom, index) => (
        <Atom key={index} {...atom} />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes atom-float {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(6px, -10px); }
          50% { transform: translate(-4px, -18px); }
          75% { transform: translate(8px, -8px); }
        }
      `}} />
    </div>
  );
};

export default AtomBackground;
