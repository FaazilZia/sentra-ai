import React, { useEffect } from 'react';

export const AtmosphericBackground: React.FC = () => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty('--mouse-x', x.toString());
      document.documentElement.style.setProperty('--mouse-y', y.toString());
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <div className="circuit-container">
        <div className="circuit-bg" />
        <div className="circuit-overlay" />
        <div className="circuit-glow" />
        <div className="circuit-chip-pulse" />
        <div className="circuit-accent-glow" />
        <div className="circuit-scan" />
        <div className="noise-overlay" />
      </div>
      <div className="liquid-mesh-premium" />
    </>
  );
};
