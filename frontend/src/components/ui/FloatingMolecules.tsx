'use client';

import { useRef, useEffect, useCallback } from 'react';

/* ─── Molecule shape templates (relative coords 0-100) ─── */
interface MolAtom { x: number; y: number; r: number; color: string }
interface MolShape { atoms: MolAtom[]; bonds: [number, number][] }

const SHAPES: MolShape[] = [
  // Benzene ring
  {
    atoms: [
      { x: 50, y: 10, r: 8, color: '#00F5FF' },
      { x: 85, y: 30, r: 8, color: '#00F5FF' },
      { x: 85, y: 70, r: 8, color: '#00F5FF' },
      { x: 50, y: 90, r: 8, color: '#00F5FF' },
      { x: 15, y: 70, r: 8, color: '#00F5FF' },
      { x: 15, y: 30, r: 8, color: '#00F5FF' },
      { x: 50, y: -8, r: 5, color: '#FFFFFF' },
      { x: 98, y: 20, r: 5, color: '#FFFFFF' },
      { x: 98, y: 80, r: 5, color: '#FFFFFF' },
      { x: 50, y: 108, r: 5, color: '#FFFFFF' },
      { x: 2, y: 80, r: 5, color: '#FFFFFF' },
      { x: 2, y: 20, r: 5, color: '#FFFFFF' },
    ],
    bonds: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]],
  },
  // H2O style
  {
    atoms: [
      { x: 50, y: 30, r: 8, color: '#3563E9' },
      { x: 20, y: 72, r: 5, color: '#00F5FF' },
      { x: 80, y: 72, r: 5, color: '#00F5FF' },
    ],
    bonds: [[0,1],[0,2]],
  },
  // Methane tetrahedral style
  {
    atoms: [
      { x: 50, y: 45, r: 7, color: '#22D3EE' },
      { x: 50, y: 8, r: 4, color: '#3563E9' },
      { x: 85, y: 70, r: 4, color: '#3563E9' },
      { x: 15, y: 70, r: 4, color: '#3563E9' },
      { x: 50, y: 92, r: 4, color: '#3563E9' },
    ],
    bonds: [[0,1],[0,2],[0,3],[0,4]],
  },
  // Chain
  {
    atoms: [
      { x: 10, y: 50, r: 5, color: '#00F5FF' },
      { x: 38, y: 35, r: 5, color: '#3563E9' },
      { x: 66, y: 50, r: 6, color: '#22D3EE' },
      { x: 90, y: 35, r: 4, color: '#cffafe' },
      { x: 5, y: 28, r: 3, color: '#cffafe' },
      { x: 5, y: 72, r: 3, color: '#cffafe' },
      { x: 38, y: 12, r: 3, color: '#cffafe' },
    ],
    bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[1,6]],
  },
  // Double ring
  {
    atoms: [
      { x: 30, y: 15, r: 5, color: '#cffafe' },
      { x: 55, y: 20, r: 5, color: '#00F5FF' },
      { x: 60, y: 48, r: 5, color: '#cffafe' },
      { x: 40, y: 60, r: 5, color: '#00F5FF' },
      { x: 18, y: 50, r: 5, color: '#cffafe' },
      { x: 12, y: 28, r: 5, color: '#00F5FF' },
      { x: 78, y: 32, r: 5, color: '#00F5FF' },
      { x: 85, y: 56, r: 5, color: '#cffafe' },
      { x: 65, y: 72, r: 5, color: '#00F5FF' },
    ],
    bonds: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[2,6],[6,7],[7,8],[8,3]],
  },
  // Complex
  {
    atoms: [
      { x: 50, y: 35, r: 6, color: '#00F5FF' },
      { x: 24, y: 25, r: 5, color: '#22D3EE' },
      { x: 76, y: 25, r: 5, color: '#3563E9' },
      { x: 50, y: 65, r: 5, color: '#cffafe' },
      { x: 88, y: 10, r: 3, color: '#00F5FF' },
      { x: 90, y: 45, r: 3, color: '#00F5FF' },
      { x: 10, y: 12, r: 3, color: '#00F5FF' },
      { x: 35, y: 82, r: 3, color: '#00F5FF' },
      { x: 65, y: 82, r: 3, color: '#00F5FF' },
    ],
    bonds: [[0,1],[0,2],[0,3],[2,4],[2,5],[1,6],[3,7],[3,8]],
  },
];

/* ─── Floating molecule entity ─── */
interface MolEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  rotSpeed: number;
  shape: MolShape;
  opacity: number;
}

export const FloatingMolecules = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const moleculesRef = useRef<MolEntity[]>([]);
  const rafRef = useRef<number>(0);

  const initMolecules = useCallback((w: number, h: number) => {
    const count = w < 768 ? 12 : 24;
    const mols: MolEntity[] = [];
    for (let i = 0; i < count; i++) {
      mols.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        scale: 0.7 + Math.random() * 1.0, // 0.7 - 1.7
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.005,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        opacity: 0.35 + Math.random() * 0.2, // 0.35 - 0.55
      });
    }
    moleculesRef.current = mols;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (moleculesRef.current.length === 0) {
        initMolecules(canvas.width, canvas.height);
      }
    };

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('mouseleave', onLeave);
    resize();

    const REPEL_RADIUS = 200;
    const REPEL_FORCE = 2.5;
    const DAMPING = 0.995;
    const SPEED_LIMIT = 1.8;

    const drawMolecule = (mol: MolEntity) => {
      const { x, y, scale, rotation, shape, opacity } = mol;
      const s = scale * 1.2; // base pixel size per unit

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;

      // Draw bonds
      for (const [a, b] of shape.bonds) {
        const ax = (shape.atoms[a].x - 50) * s;
        const ay = (shape.atoms[a].y - 50) * s;
        const bx = (shape.atoms[b].x - 50) * s;
        const by = (shape.atoms[b].y - 50) * s;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        
        // Gradient stroke for high-end feel
        const NODE_COLORS = ['#00F5FF', '#cffafe', '#ffffff', '#1A36A8']; // Electric Cyan, Light Cyan, White, Royal Blue
        const LINK_COLOR_DEFAULT = 'rgba(0, 245, 255, 0.15)';
        const gradient = ctx.createLinearGradient(ax, ay, bx, by);
        gradient.addColorStop(0, `rgba(0, 245, 255, ${0.2 * opacity})`);
        gradient.addColorStop(1, `rgba(207, 250, 254, ${0.2 * opacity})`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      }

      // Draw atoms with glow
      for (const atom of shape.atoms) {
        const ax = (atom.x - 50) * s;
        const ay = (atom.y - 50) * s;
        const r = atom.r * s * 0.6;

        // Subtle glow
        const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, r * 2.5);
        glow.addColorStop(0, atom.color + '40');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(ax, ay, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Solid sphere
        const grad = ctx.createRadialGradient(ax - r * 0.3, ay - r * 0.3, 0, ax, ay, r);
        grad.addColorStop(0, atom.color + 'ff');
        grad.addColorStop(0.7, atom.color + 'cc');
        grad.addColorStop(1, atom.color + '44');
        ctx.beginPath();
        ctx.arc(ax, ay, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      for (const mol of moleculesRef.current) {
        // Antigravity: repel from cursor
        const dx = mol.x - mouse.x;
        const dy = mol.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_FORCE;
          mol.vx += (dx / dist) * force;
          mol.vy += (dy / dist) * force;

          // Boost opacity when interacted with
          mol.opacity = Math.min(mol.opacity + 0.008, 0.55);
        } else {
          // Fade back to resting opacity
          mol.opacity += (0.6 - mol.opacity) * 0.01;
        }

        // Damping
        mol.vx *= DAMPING;
        mol.vy *= DAMPING;

        // Speed limit
        const speed = Math.sqrt(mol.vx * mol.vx + mol.vy * mol.vy);
        if (speed > SPEED_LIMIT) {
          mol.vx = (mol.vx / speed) * SPEED_LIMIT;
          mol.vy = (mol.vy / speed) * SPEED_LIMIT;
        }

        // Update position
        mol.x += mol.vx;
        mol.y += mol.vy;
        mol.rotation += mol.rotSpeed;

        // Soft wrap at edges (bounce with damping)
        const margin = 60;
        if (mol.x < -margin) { mol.x = -margin; mol.vx = Math.abs(mol.vx) * 0.5; }
        if (mol.x > canvas.width + margin) { mol.x = canvas.width + margin; mol.vx = -Math.abs(mol.vx) * 0.5; }
        if (mol.y < -margin) { mol.y = -margin; mol.vy = Math.abs(mol.vy) * 0.5; }
        if (mol.y > canvas.height + margin) { mol.y = canvas.height + margin; mol.vy = -Math.abs(mol.vy) * 0.5; }

        drawMolecule(mol);
      }

      // Draw faint connection lines between nearby molecules
      const mols = moleculesRef.current;
      for (let i = 0; i < mols.length; i++) {
        for (let j = i + 1; j < mols.length; j++) {
          const dx = mols[i].x - mols[j].x;
          const dy = mols[i].y - mols[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 300) {
            ctx.beginPath();
            ctx.moveTo(mols[i].x, mols[i].y);
            ctx.lineTo(mols[j].x, mols[j].y);
            const lineOpacity = 0.35 * (1 - d / 300) * (0.8 + Math.sin(Date.now() * 0.001 + i) * 0.2);
            ctx.strokeStyle = `rgba(0, 245, 255, ${lineOpacity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [initMolecules]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};
