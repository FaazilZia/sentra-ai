import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  opacityDir: number;
  color: string;
}

const COLORS = [
  'rgba(244, 231, 241,',  // #f4e7f1 — lavender pink
  'rgba(242, 38, 125,',  // pink mid-tone
  'rgba(255, 206, 227,',  // light pink
  'rgba(255, 255, 255,',  // white
  'rgba(242, 38, 125,',   // soft pink
];

export const FloatingParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let mouse = { x: -999, y: -999 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const spawn = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35 - 0.1, // slight upward drift
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });

    const init = () => {
      resize();
      particles = Array.from({ length: 180 }, spawn);
    };

    const connect = (a: Particle, b: Particle) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const alpha = (1 - dist / 100) * 0.08;
        ctx.save();
        ctx.strokeStyle = `rgba(255,182,193,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.y < -5) p.y = canvas.height + 5;
        if (p.y > canvas.height + 5) p.y = -5;

        // Cursor gentle repulsion
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 130) {
          const force = (130 - mdist) / 130;
          p.x += (mdx / mdist) * force * 1.8;
          p.y += (mdy / mdist) * force * 1.8;
        }

        // Breathing opacity
        p.opacity += p.opacityDir * 0.003;
        if (p.opacity > 0.55 || p.opacity < 0.05) p.opacityDir *= -1;

        // Draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          connect(p, particles[j]);
        }
      });

      animId = requestAnimationFrame(draw);
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    init();
    draw();
    window.addEventListener('resize', init);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-5] pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
};
