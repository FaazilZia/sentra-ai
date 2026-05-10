import React, { useEffect, useRef, useState } from 'react';

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  glow: number;
  pulsePhase: number;
  pulseSpeed: number;
  orbitRadius: number;
  orbitPhase: number;
  orbitSpeed: number;
  color: string;
}

interface GlowBlob {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
}

const NeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2),
        y: (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)
      };
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let nodes: Node[] = [];
    let glowBlobs: GlowBlob[] = [];
    const isMobile = windowSize.width < 768;
    const nodeCount = isMobile ? 30 : 65;
    const connectionDistance = isMobile ? 140 : 200;

    // BRAND PALETTE
    const PRIMARY_BLUE = '37, 99, 235'; 
    const SECONDARY_BLACK = '15, 23, 42'; // Slate 900 for "Technical Atoms"
    const createNodes = () => {
      // 1. Create Core Network Nodes
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const z = Math.random() * 0.8 + 0.2; 
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const isBlack = Math.random() > 0.6; // 40% are black atoms
        
        nodes.push({
          x, y, baseX: x, baseY: y, z,
          vx: (Math.random() - 0.5) * (isBlack ? 0.08 : 0.1),
          vy: (Math.random() - 0.5) * (isBlack ? 0.08 : 0.1),
          radius: (isBlack ? 0.4 : 1.2) * z,
          glow: isBlack ? 2 : Math.random() * 8 + 4,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.01 + Math.random() * 0.015,
          orbitRadius: isBlack ? Math.random() * 2 + 1 : Math.random() * 4 + 2,
          orbitPhase: Math.random() * Math.PI * 2,
          orbitSpeed: (Math.random() - 0.5) * (isBlack ? 0.005 : 0.008),
          color: isBlack ? SECONDARY_BLACK : PRIMARY_BLUE
        });
      }

      // 2. Create Gradient Glow Blobs (Layer 2)
      glowBlobs = [];
      const blobCount = isMobile ? 2 : 4;
      for (let i = 0; i < blobCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        glowBlobs.push({
          x, y, baseX: x, baseY: y,
          radius: (canvas.width * (0.2 + Math.random() * 0.2)),
          vx: (Math.random() - 0.5) * 0.05,
          vy: (Math.random() - 0.5) * 0.05,
          color: i % 2 === 0 ? `rgba(${PRIMARY_BLUE}, 0.03)` : `rgba(56, 189, 248, 0.02)`
        });
      }
    };

    const resize = () => {
      canvas.width = windowSize.width;
      canvas.height = windowSize.height;
      createNodes();
    };

    resize();

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Layer 2: Gradient Glow Field ---
      glowBlobs.forEach(blob => {
        blob.baseX += blob.vx;
        blob.baseY += blob.vy;
        
        // Wrap
        if (blob.baseX < -blob.radius) blob.baseX = canvas.width + blob.radius;
        if (blob.baseX > canvas.width + blob.radius) blob.baseX = -blob.radius;
        if (blob.baseY < -blob.radius) blob.baseY = canvas.height + blob.radius;
        if (blob.baseY > canvas.height + blob.radius) blob.baseY = -blob.radius;

        // Subtle mouse reaction
        blob.x = blob.baseX + mouseRef.current.x * 20;
        blob.y = blob.baseY + mouseRef.current.y * 20;

        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- Layer 1: Neural Network ---
      const wavePeriod = 10000;
      const waveWidth = canvas.width * 0.4;
      const waveX = (time % wavePeriod) / wavePeriod * (canvas.width + waveWidth * 2) - waveWidth;

      nodes.forEach((node, i) => {
        node.baseX += node.vx;
        node.baseY += node.vy;

        if (node.baseX < -50) node.baseX = canvas.width + 50;
        if (node.baseX > canvas.width + 50) node.baseX = -50;
        if (node.baseY < -50) node.baseY = canvas.height + 50;
        if (node.baseY > canvas.height + 50) node.baseY = -50;

        node.orbitPhase += node.orbitSpeed;
        const orbitX = Math.sin(node.orbitPhase) * node.orbitRadius;
        const orbitY = Math.cos(node.orbitPhase) * node.orbitRadius;

        const mousePX = mouseRef.current.x * 30 * node.z;
        const mousePY = mouseRef.current.y * 30 * node.z;
        
        node.x = node.baseX + orbitX + mousePX;
        node.y = node.baseY + orbitY + mousePY;

        const distToWave = Math.abs(node.x - waveX);
        const waveIntensity = Math.exp(-(distToWave * distToWave) / (2 * (waveWidth / 3) * (waveWidth / 3)));

        node.pulsePhase += node.pulseSpeed;
        const individualPulse = (Math.sin(node.pulsePhase) + 1) / 2;
        const nodeIntensity = (0.2 + individualPulse * 0.3) + (waveIntensity * 0.4);
        
        // Connections
        ctx.lineWidth = 0.4 * node.z;
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const flicker = 0.9 + Math.random() * 0.1;
            const connectionAlpha = (1 - dist / connectionDistance) * (0.04 + waveIntensity * 0.05) * flicker * Math.min(node.z, other.z);
            
            const crossConnect = node.color !== other.color;
            const finalAlpha = crossConnect ? connectionAlpha * 0.3 : connectionAlpha;
            const strokeColor = crossConnect ? PRIMARY_BLUE : node.color;
            
            ctx.strokeStyle = `rgba(${strokeColor}, ${finalAlpha})`;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }

        // Node Rendering
        const baseAlpha = node.color === SECONDARY_BLACK ? 0.15 * node.z : 0.08 * node.z;
        const fillAlpha = baseAlpha + (nodeIntensity * 0.1 * node.z);
        
        ctx.shadowBlur = node.glow * (0.5 + waveIntensity);
        ctx.shadowColor = `rgba(${node.color}, ${fillAlpha * 0.5})`;
        ctx.fillStyle = `rgba(${node.color}, ${fillAlpha})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [windowSize]);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* Layer 3: Grid / Depth Layer */}
      <div className="absolute inset-0 opacity-[0.02] bg-grid-pattern" 
        style={{ 
          backgroundSize: '60px 60px',
          backgroundImage: `linear-gradient(to right, rgb(${37}, ${99}, ${235}) 1px, transparent 1px), linear-gradient(to bottom, rgb(${37}, ${99}, ${235}) 1px, transparent 1px)`
        }} 
      />
      <div className="noise-overlay" />
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
};

export default NeuralBackground;
