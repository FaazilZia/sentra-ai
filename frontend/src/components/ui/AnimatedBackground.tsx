import React, { useCallback, useEffect, useRef, useState } from 'react';

/* ─── Atom ──────────────────────────────────────────────── */

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

/* ─── Molecule Templates (ball-and-stick) ───────────────── */

type Shade = 'dark' | 'med' | 'light';
interface MolAtom { x: number; y: number; r: number; shade: Shade }
interface MolTemplate { atoms: MolAtom[]; bonds: [number, number][] }

const moleculeTemplates: MolTemplate[] = [
  // 0 — Purine-like double ring (reference image style)
  {
    atoms: [
      { x: 30, y: 12, r: 6, shade: 'dark' },
      { x: 52, y: 18, r: 6, shade: 'med' },
      { x: 58, y: 42, r: 6, shade: 'dark' },
      { x: 40, y: 56, r: 6, shade: 'dark' },
      { x: 18, y: 48, r: 6, shade: 'med' },
      { x: 12, y: 26, r: 6, shade: 'dark' },
      { x: 75, y: 30, r: 6, shade: 'med' },
      { x: 82, y: 52, r: 6, shade: 'dark' },
      { x: 62, y: 65, r: 6, shade: 'med' },
      { x: 25, y: -2, r: 3.5, shade: 'light' },
      { x: -2, y: 20, r: 3.5, shade: 'light' },
      { x: 5, y: 62, r: 3.5, shade: 'light' },
      { x: 35, y: 74, r: 3.5, shade: 'light' },
      { x: 96, y: 58, r: 3.5, shade: 'light' },
      { x: 85, y: 15, r: 3.5, shade: 'light' },
    ],
    bonds: [
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
      [2,6],[6,7],[7,8],[8,3],
      [0,9],[5,10],[4,11],[3,12],[7,13],[6,14],
    ],
  },
  // 1 — Benzene ring
  {
    atoms: [
      { x: 50, y: 10, r: 6, shade: 'dark' },
      { x: 78, y: 26, r: 6, shade: 'dark' },
      { x: 78, y: 58, r: 6, shade: 'dark' },
      { x: 50, y: 74, r: 6, shade: 'dark' },
      { x: 22, y: 58, r: 6, shade: 'dark' },
      { x: 22, y: 26, r: 6, shade: 'dark' },
      { x: 50, y: -4, r: 3.5, shade: 'light' },
      { x: 94, y: 18, r: 3.5, shade: 'light' },
      { x: 94, y: 66, r: 3.5, shade: 'light' },
      { x: 50, y: 88, r: 3.5, shade: 'light' },
      { x: 6, y: 66, r: 3.5, shade: 'light' },
      { x: 6, y: 18, r: 3.5, shade: 'light' },
    ],
    bonds: [
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
      [0,6],[1,7],[2,8],[3,9],[4,10],[5,11],
    ],
  },
  // 2 — Water molecule (H2O)
  {
    atoms: [
      { x: 50, y: 28, r: 10, shade: 'med' },
      { x: 22, y: 65, r: 6, shade: 'light' },
      { x: 78, y: 65, r: 6, shade: 'light' },
    ],
    bonds: [[0,1],[0,2]],
  },
  // 3 — Ethanol-like chain
  {
    atoms: [
      { x: 12, y: 50, r: 6, shade: 'dark' },
      { x: 38, y: 36, r: 6, shade: 'dark' },
      { x: 64, y: 50, r: 7, shade: 'med' },
      { x: 86, y: 36, r: 4, shade: 'light' },
      { x: 4, y: 30, r: 3.5, shade: 'light' },
      { x: 4, y: 68, r: 3.5, shade: 'light' },
      { x: 38, y: 14, r: 3.5, shade: 'light' },
      { x: 55, y: 22, r: 3.5, shade: 'light' },
    ],
    bonds: [
      [0,1],[1,2],[2,3],
      [0,4],[0,5],[1,6],[1,7],
    ],
  },
  // 4 — Methane (tetrahedral projection)
  {
    atoms: [
      { x: 50, y: 44, r: 8, shade: 'dark' },
      { x: 50, y: 10, r: 5, shade: 'light' },
      { x: 82, y: 64, r: 5, shade: 'light' },
      { x: 18, y: 64, r: 5, shade: 'light' },
      { x: 50, y: 82, r: 5, shade: 'light' },
    ],
    bonds: [[0,1],[0,2],[0,3],[0,4]],
  },
  // 5 — Amino acid backbone
  {
    atoms: [
      { x: 50, y: 36, r: 6, shade: 'dark' },
      { x: 24, y: 26, r: 6, shade: 'med' },
      { x: 76, y: 26, r: 6, shade: 'dark' },
      { x: 92, y: 12, r: 5, shade: 'med' },
      { x: 90, y: 46, r: 5, shade: 'med' },
      { x: 50, y: 62, r: 6, shade: 'dark' },
      { x: 10, y: 14, r: 3.5, shade: 'light' },
      { x: 16, y: 42, r: 3.5, shade: 'light' },
      { x: 98, y: 56, r: 3.5, shade: 'light' },
      { x: 38, y: 78, r: 3.5, shade: 'light' },
      { x: 62, y: 78, r: 3.5, shade: 'light' },
    ],
    bonds: [
      [0,1],[0,2],[0,5],
      [2,3],[2,4],
      [1,6],[1,7],[4,8],
      [5,9],[5,10],
    ],
  },
];

/* ─── Molecule Component ────────────────────────────────── */

interface MoleculeProps {
  template: number;
  size: number;
  top: string;
  left: string;
  speedMultiplier: number;
  rotation: number;
  opacity: number;
}

const SHADE_KEY: Record<Shade, string> = { dark: 'd', med: 'm', light: 'l' };

const Molecule: React.FC<MoleculeProps> = ({
  template, size, top, left, speedMultiplier, rotation, opacity,
}) => {
  const mol = moleculeTemplates[template];
  const floatDuration = 8 + speedMultiplier * 5;
  const uid = useRef(`m${Math.random().toString(36).slice(2, 8)}`).current;

  return (
    <div
      className="absolute pointer-events-none molecule-element"
      style={{
        width: size,
        height: size,
        top,
        left,
        opacity,
        animation: `molecule-float ${floatDuration}s ease-in-out infinite`,
      }}
    >
      <svg
        viewBox="-8 -8 116 100"
        width="100%"
        height="100%"
        style={{ transform: `rotate(${rotation}deg)`, overflow: 'visible' }}
      >
        <defs>
          {/* 3-D sphere gradients */}
          <radialGradient id={`${uid}-d`} cx="35%" cy="35%">
            <stop offset="0%" stopColor="#666" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          <radialGradient id={`${uid}-m`} cx="35%" cy="35%">
            <stop offset="0%" stopColor="#999" />
            <stop offset="100%" stopColor="#333" />
          </radialGradient>
          <radialGradient id={`${uid}-l`} cx="30%" cy="30%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#aaa" />
          </radialGradient>
        </defs>

        {/* Bonds (rendered behind atoms) */}
        {mol.bonds.map(([a, b], i) => (
          <line
            key={`b${i}`}
            x1={mol.atoms[a].x} y1={mol.atoms[a].y}
            x2={mol.atoms[b].x} y2={mol.atoms[b].y}
            stroke="#555" strokeWidth={2.2} strokeLinecap="round"
          />
        ))}

        {/* Atoms */}
        {mol.atoms.map((atom, i) => (
          <circle
            key={`a${i}`}
            cx={atom.x} cy={atom.y} r={atom.r}
            fill={`url(#${uid}-${SHADE_KEY[atom.shade]})`}
            stroke="rgba(0,0,0,0.08)" strokeWidth={0.5}
          />
        ))}
      </svg>
    </div>
  );
};

/* ─── Background Container ──────────────────────────────── */

const AtomBackground: React.FC = () => {
  const [atoms, setAtoms] = useState<AtomProps[]>([]);
  const [molecules, setMolecules] = useState<MoleculeProps[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Atoms (5-8)
    const atomCount = Math.floor(Math.random() * 4) + 5;
    const newAtoms: AtomProps[] = [];
    for (let i = 0; i < atomCount; i++) {
      newAtoms.push({
        size: Math.floor(Math.random() * 100) + 60,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        rings: Math.floor(Math.random() * 2) + 2,
        speedMultiplier: 0.5 + Math.random(),
        angle: Math.random() * 360,
      });
    }
    setAtoms(newAtoms);

    // Molecules (3-5)
    const molCount = Math.floor(Math.random() * 3) + 3;
    const newMols: MoleculeProps[] = [];
    for (let i = 0; i < molCount; i++) {
      newMols.push({
        template: Math.floor(Math.random() * moleculeTemplates.length),
        size: Math.floor(Math.random() * 90) + 90, // 90-180 px
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        speedMultiplier: 0.4 + Math.random() * 0.8,
        rotation: Math.random() * 360,
        opacity: 0.18 + Math.random() * 0.2,
      });
    }
    setMolecules(newMols);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollY = window.scrollY;
    const blur = Math.min(scrollY / 80, 6);
    const opacity = Math.max(1 - scrollY / 800, 0.15);
    containerRef.current.style.filter = `blur(${blur}px)`;
    containerRef.current.style.opacity = String(opacity);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none transition-[filter,opacity] duration-200"
    >
      {atoms.map((atom, i) => (
        <Atom key={`atom-${i}`} {...atom} />
      ))}
      {molecules.map((mol, i) => (
        <Molecule key={`mol-${i}`} {...mol} />
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
        @keyframes molecule-float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(8px, -14px); }
          66% { transform: translate(-6px, -10px); }
        }
      `}} />
    </div>
  );
};

export default AtomBackground;
