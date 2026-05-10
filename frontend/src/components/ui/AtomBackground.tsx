const ATOMS = [
  { x: 5, y: 10, size: 120, rings: 3, opacity: 0.45 },
  { x: 78, y: 4, size: 90, rings: 2, opacity: 0.35 },
  { x: 88, y: 48, size: 140, rings: 3, opacity: 0.4 },
  { x: 8, y: 72, size: 100, rings: 2, opacity: 0.35 },
  { x: 48, y: 84, size: 160, rings: 3, opacity: 0.3 },
  { x: 28, y: 30, size: 70, rings: 2, opacity: 0.4 },
  { x: 64, y: 52, size: 110, rings: 3, opacity: 0.35 },
];

const RING_TILTS = [0, 65, -50];
const RING_CLASSES = [
  'atom-ring-speed-1',
  'atom-ring-speed-2',
  'atom-ring-speed-3',
];

export function AtomBackground() {
  return (
    <div className="atom-bg-container" aria-hidden="true">
      {ATOMS.map((atom, i) => (
        <div
          key={i}
          className="atom-body"
          style={{
            left: `${atom.x}%`,
            top: `${atom.y}%`,
            width: `${atom.size}px`,
            height: `${atom.size}px`,
            opacity: atom.opacity,
          }}
        >
          {/* Nucleus */}
          <div
            className="atom-nucleus"
            style={{
              width: `${Math.max(6, atom.size * 0.09)}px`,
              height: `${Math.max(6, atom.size * 0.09)}px`,
            }}
          />

          {/* Electron orbits */}
          {RING_TILTS.slice(0, atom.rings).map((tilt, j) => (
            <div
              key={j}
              className="atom-ring-wrapper"
              style={{ transform: `rotateZ(${tilt}deg) scaleY(0.35)` }}
            >
              <div className={`atom-ring ${RING_CLASSES[j]}`}>
                <div className="atom-electron" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
