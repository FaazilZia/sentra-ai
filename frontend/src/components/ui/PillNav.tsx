'use client';

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  href: string;
}

interface PillNavProps {
  items: NavItem[];
  activeHref?: string;
  isScrolled?: boolean;
  className?: string;
  linkComponent?: React.ElementType;
  onNavClick?: () => void;
}

/**
 * PillNav Component - Hover-Only Mode
 * The blue pill background only appears on hover.
 */
export const PillNav: React.FC<PillNavProps> = ({
  items,
  activeHref,
  isScrolled,
  className,
  linkComponent: Link = 'a',
  onNavClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const index = items.findIndex(item => item.href === activeHref);
    if (index !== -1) setActiveIndex(index);
  }, [activeHref, items]);

  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  const movePill = (target: HTMLElement, duration = 0.5) => {
    if (!pillRef.current) return;
    
    gsap.to(pillRef.current, {
      x: target.offsetLeft,
      width: target.offsetWidth,
      autoAlpha: 1, 
      duration,
      ease: 'expo.out',
      overwrite: 'auto'
    });
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    movePill(e.currentTarget);
  };

  const handleMouseLeave = () => {
    // ALWAYS fade out when mouse leaves navigation area
    if (pillRef.current) {
      gsap.to(pillRef.current, { autoAlpha: 0, duration: 0.3 });
    }
  };

  useIsomorphicLayoutEffect(() => {
    if (!isMounted || !containerRef.current) return;

    // We only use the observer to ensure hover calculations are correct after resize.
    // Persistent background snapping removed per user request for "hover-only" mode.
    const observer = new ResizeObserver(() => {
      // Background pill remains hidden on resize unless hovering
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isMounted, isScrolled]);

  const onItemClick = (index: number) => {
    setActiveIndex(index);
    if (onNavClick) onNavClick();
  };

  if (!isMounted) return null;

  return (
    <div 
      ref={containerRef}
      className={cn("relative flex items-center p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md h-full transition-all duration-300", className)}
      onMouseLeave={handleMouseLeave}
      role="menubar"
    >
      <div 
        ref={pillRef}
        className="absolute h-[calc(100%-12px)] top-[6px] left-0 rounded-full bg-pink-600 shadow-[0_4px_12px_rgba(242,38,125,0.45)] pointer-events-none z-0 invisible opacity-0"
        style={{ width: 0 }}
      />

      {items.map((item, index) => (
        <Link
          key={item.label}
          href={item.href}
          to={item.href}
          ref={(el: HTMLAnchorElement | null) => (itemsRef.current[index] = el)}
          className={cn(
            "relative z-10 px-5 py-2 text-[13px] font-bold uppercase tracking-widest transition-colors duration-300 no-underline whitespace-nowrap",
            activeIndex === index ? "text-white" : "text-white/60 hover:text-white"
          )}
          role="menuitem"
          onMouseEnter={handleMouseEnter}
          onClick={() => onItemClick(index)}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

export default PillNav;
