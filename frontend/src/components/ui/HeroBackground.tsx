import React, { useEffect, useRef } from 'react';

/**
 * HeroBackground — Refined Premium Enterprise Edition
 *
 * Single ambient green orb behind headline center.
 * Subtle diagonal gradient, grain texture, vignette.
 * No grid. No multiple orbs. No harsh edges.
 * Completely distraction-free and white-text compatible.
 */
export const HeroBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Pre-generate noise once on small offscreen canvas
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 512;
    noiseCanvas.height = 512;
    const nCtx = noiseCanvas.getContext('2d')!;
    const imgData = nCtx.createImageData(512, 512);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 255;
      imgData.data[i]     = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    nCtx.putImageData(imgData, 0, 0);

    const render = (time: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const t = time * 0.00025; // very slow — almost imperceptible motion

      ctx.clearRect(0, 0, W, H);

      // ── Layer 1: Solid base ─────────────────────────────────────
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // ── Layer 2: Diagonal deep-green gradient (top-left → bottom-right) ──
      const diagGrad = ctx.createLinearGradient(0, 0, W * 0.7, H);
      diagGrad.addColorStop(0.0,  'rgba(5,  46, 43,  0.60)');
      diagGrad.addColorStop(0.40, 'rgba(6,  78, 59,  0.30)');
      diagGrad.addColorStop(0.75, 'rgba(15, 118, 110, 0.10)');
      diagGrad.addColorStop(1.0,  'rgba(2,  6,  23,  0.00)');
      ctx.fillStyle = diagGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Layer 3: Single ambient orb — centered slightly above headline ──
      // Gently breathes: opacity oscillates 0.11 → 0.17
      const orbOpacity = 0.14 + Math.sin(t * 1.2) * 0.03;
      const orbX = W * 0.50;
      const orbY = H * 0.28; // above center = behind headline
      const orbR = Math.min(W, H) * 0.55; // large, highly diffused

      const orb = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
      orb.addColorStop(0.00, `rgba(15, 118, 110, ${orbOpacity})`);
      orb.addColorStop(0.35, `rgba(6,  78,  59,  ${orbOpacity * 0.55})`);
      orb.addColorStop(0.70, `rgba(5,  46,  43,  ${orbOpacity * 0.20})`);
      orb.addColorStop(1.00, 'rgba(2, 6, 23, 0.00)');
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, W, H);

      // ── Layer 4: Center brightening (focus anchor behind headline) ──
      const focusGrad = ctx.createRadialGradient(
        W * 0.5, H * 0.32, 0,
        W * 0.5, H * 0.32, W * 0.30
      );
      focusGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.012)');
      focusGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.000)');
      ctx.fillStyle = focusGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Layer 5: Film grain (1.5% opacity) ─────────────────────
      ctx.save();
      ctx.globalAlpha = 0.015;
      ctx.globalCompositeOperation = 'screen';
      for (let nx = 0; nx < W; nx += 512) {
        for (let ny = 0; ny < H; ny += 512) {
          ctx.drawImage(noiseCanvas, nx, ny);
        }
      }
      ctx.restore();

      // ── Layer 6: Edge vignette ──────────────────────────────────
      const vignette = ctx.createRadialGradient(
        W / 2, H / 2, H * 0.20,
        W / 2, H / 2, H * 0.95
      );
      vignette.addColorStop(0.0, 'rgba(2, 6, 23, 0.00)');
      vignette.addColorStop(1.0, 'rgba(2, 6, 23, 0.70)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default HeroBackground;
