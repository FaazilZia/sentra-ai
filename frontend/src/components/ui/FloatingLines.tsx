'use client';

import React, { useRef, useEffect } from 'react';

interface FloatingLinesProps {
  linesGradient?: string[];
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
}

/**
 * FloatingLines - A high-performance canvas background component.
 * Animates reactive paths that 'bend' when the mouse passes nearby.
 */
export const FloatingLines: React.FC<FloatingLinesProps> = ({
  linesGradient = ["#06101e", "#2F4BC0", "#becbc2", "#06101e"],
  animationSpeed = 1,
  interactive = true,
  bendRadius = 150,
  bendStrength = 1.5,
  mouseDamping = 0.05,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    // Create line objects
    const lineCount = 40;
    const lines = Array.from({ length: lineCount }, (_, i) => ({
      baseY: (canvas.height / lineCount) * i,
      offset: Math.random() * Math.PI * 2,
      amplitude: 20 + Math.random() * 30,
      frequency: 0.002 + Math.random() * 0.002,
    }));

    const render = () => {
      // Damping for smooth mouse movement
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * mouseDamping;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * mouseDamping;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      linesGradient.forEach((color, i) => {
        gradient.addColorStop(i / (linesGradient.length - 1), color);
      });

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      time += 0.01 * animationSpeed;

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(0, line.baseY + Math.sin(time + line.offset) * line.amplitude);

        const segments = 100;
        const segmentWidth = canvas.width / segments;

        for (let x = 0; x <= canvas.width; x += segmentWidth) {
          let y = line.baseY + Math.sin(x * line.frequency + time + line.offset) * line.amplitude;

          if (interactive) {
            const dx = x - mouseRef.current.x;
            const dy = y - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < bendRadius) {
              const influence = (1 - dist / bendRadius) * bendStrength;
              y += dy * influence;
            }
          }

          ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [linesGradient, animationSpeed, interactive, bendRadius, bendStrength, mouseDamping]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 block w-full h-full pointer-events-none opacity-40" 
    />
  );
};

export default FloatingLines;
