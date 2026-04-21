import React, { useRef, useEffect, useState, useCallback, useId } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
}

interface GooeyNavProps {
  items: NavItem[];
  className?: string;
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
}

/**
 * GooeyNav Component - Stable Version
 * Uses SVG filters for the gooey effect to avoid CSS blend-mode glitches.
 */
const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  className,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  
  
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const [isMounted, setIsMounted] = useState(false);
  const filterId = useId().replace(/:/g, ''); // Generate unique clean ID for SVG filter
  
  const activeTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const rafId = useRef<number | null>(null);

  const registerTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      activeTimeouts.current.delete(id);
      fn();
    }, delay);
    activeTimeouts.current.add(id);
    return id;
  };

  const noise = (n = 1) => n / 2 - Math.random() * n;
  
  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const makeParticles = useCallback((element: HTMLElement) => {
    if (!element) return;
    
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      
      element.classList.remove('active');
      
      registerTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        
        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        
        rafId.current = requestAnimationFrame(() => {
          element.classList.add('active');
        });
        
        registerTimeout(() => {
          if (element.contains(particle)) {
            element.removeChild(particle);
          }
        }, t);
      }, 30);
    }
  }, [animationTime, particleCount, particleDistances, particleR, timeVariance, colors]);

  const updateEffectPosition = useCallback((element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    
    const textNode = element.querySelector('.nav-label');
    textRef.current.innerText = textNode ? textNode.textContent || "" : (element as HTMLLIElement).innerText;
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, index: number) => {
    const liEl = (e.currentTarget.closest('li') as HTMLElement);
    if (!liEl || activeIndex === index) return;
    
    setActiveIndex(index);
    updateEffectPosition(liEl);
    
    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll('.particle');
      particles.forEach(p => filterRef.current?.removeChild(p));
      makeParticles(filterRef.current);
    }
    
    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e, index);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    return () => {
      activeTimeouts.current.forEach(clearTimeout);
      activeTimeouts.current.clear();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    if (!isMounted || !navRef.current || !containerRef.current) return;
    
    const items = navRef.current.querySelectorAll('li');
    const activeLi = items[activeIndex];
    if (activeLi) {
      updateEffectPosition(activeLi as HTMLElement);
      textRef.current?.classList.add('active');
    }
    
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex];
        if (currentActiveLi) {
          updateEffectPosition(currentActiveLi as HTMLElement);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [activeIndex, isMounted, updateEffectPosition]);

  if (!isMounted) return null;

  return (
    <div className={cn("relative isolate", className)} ref={containerRef}>
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id={`goo-${filterId}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <style>
        {`
          :root {
            --linear-ease: linear(0, 0.068, 0.19 2.7%, 0.804 8.1%, 1.037, 1.199 13.2%, 1.245, 1.27 15.8%, 1.274, 1.272 17.4%, 1.249 19.1%, 0.996 28%, 0.949, 0.928 33.3%, 0.926, 0.933 36.8%, 1.001 45.6%, 1.013, 1.019 50.8%, 1.018 54.4%, 1 63.1%, 0.995 68%, 1.001 85%, 1);
            --color-1: #9b59f5;
            --color-2: #f4e7f1;
            --color-3: #7cff67;
            --color-4: #5227FF;
          }
          .effect {
            position: absolute;
            opacity: 1;
            pointer-events: none;
            display: grid;
            place-items: center;
            z-index: 1;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .effect.text {
            color: rgba(255, 255, 255, 0.9);
            transition: color 0.3s ease;
          }
          .effect.text.active {
            color: #272d27;
          }
          .effect.filter {
            filter: url('#goo-${filterId}');
            /* mix-blend-mode no longer needed with standard SVG filter */
          }
          .effect.filter::after {
            content: "";
            position: absolute;
            inset: 0;
            background: white;
            transform: scale(0);
            opacity: 0;
            z-index: -1;
            border-radius: 9999px;
          }
          .effect.active::after {
            animation: pill 0.3s var(--linear-ease) both;
          }
          @keyframes pill {
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          .particle,
          .point {
            display: block;
            opacity: 0;
            width: 25px;
            height: 25px;
            border-radius: 9999px;
            transform-origin: center;
          }
          .particle {
            --time: 5s;
            position: absolute;
            top: calc(50% - 12.5px);
            left: calc(50% - 12.5px);
            animation: particle calc(var(--time)) ease 1 -350ms;
          }
          .point {
            background: var(--color);
            opacity: 1;
            animation: point calc(var(--time)) ease 1 -350ms;
          }
          @keyframes particle {
            0% {
              transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
              opacity: 1;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            70% {
              transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
              opacity: 1;
            }
            100% {
              transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
              opacity: 1;
            }
          }
          @keyframes point {
            0% {
              transform: scale(0);
              opacity: 0;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            25% {
              transform: scale(calc(var(--scale) * 0.25));
            }
            38% {
              opacity: 1;
            }
            65% {
              transform: scale(var(--scale));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: scale(var(--scale));
              opacity: 1;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }
          li.active {
            color: transparent; 
            text-shadow: none;
          }
          li.active::after {
            opacity: 1;
            transform: scale(1);
          }
          li::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            background: rgba(255,255,255,0.05);
            opacity: 0;
            transform: scale(0);
            transition: all 0.3s ease;
            z-index: -1;
          }
        `}
      </style>
      
      <nav role="navigation" aria-label="Main Navigation">
        <ul
          ref={navRef}
          role="menubar"
          className="flex gap-2 list-none p-1 m-0 relative z-[3]"
        >
          {items.map((item, index) => (
            <li
              key={item.label}
              role="none"
              className={cn(
                "rounded-full relative cursor-pointer transition-all duration-300 ease",
                activeIndex === index ? "active pointer-events-none" : "hover:scale-[1.02]"
              )}
            >
              <a
                role="menuitem"
                tabIndex={0}
                aria-current={activeIndex === index ? "page" : undefined}
                onClick={e => { e.preventDefault(); handleClick(e, index); }}
                onKeyDown={e => handleKeyDown(e, index)}
                href={item.href}
                className="outline-none py-[0.8em] px-[1.5em] inline-block text-[13px] font-extrabold uppercase tracking-widest no-underline text-white/70 hover:text-white transition-colors"
                style={{ textShadow: '0 1px 1px hsl(0deg 0% 0% / 0.2)' }}
              >
                <span className="nav-label">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Visual Effect Layers */}
      <span className="effect filter" ref={filterRef} aria-hidden="true" />
      <span className="effect text" ref={textRef} aria-hidden="true" />
    </div>
  );
};

export default GooeyNav;
