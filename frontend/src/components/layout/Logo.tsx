import React, { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

// Read theme directly from the document root — avoids needing ThemeProvider context
function useDocTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const t = document.documentElement.getAttribute('data-theme');
      return (t === 'light' ? 'light' : 'dark');
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme');
      setTheme(t === 'light' ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', iconOnly = false }) => {
  const theme = useDocTheme();
  const isDark = theme === 'dark';

  const sizeMap = {
    sm: { svg: { w: 24, h: 28 }, text: 'text-xl',  sub: 'text-[6px]' },
    md: { svg: { w: 36, h: 42 }, text: 'text-2xl', sub: 'text-[8px]'  },
    lg: { svg: { w: 72, h: 84 }, text: 'text-5xl', sub: 'text-[11px]' }
  };

  const s = sizeMap[size];

  // Theme-aware colour scheme
  const lineColor    = '#D97706';
  const lineOpacity  = isDark ? 0.4 : 0.65;
  const nodeColor    = '#D97706';
  const coreRingFill = isDark ? 'white' : '#1e293b';
  const coreDotFill  = '#D97706';
  const textMutedClass = isDark ? 'text-[var(--muted)]' : 'text-slate-500';

  return (
    <div className={`logowrap logo-container flex items-center gap-4 ${className}`}>
      {/* SVG */}
      <svg
        className="logo-svg flex-shrink-0"
        width={s.svg.w}
        height={s.svg.h}
        viewBox="13 8 65 75"
        fill="none"
      >
        {/* Network lines */}
        <line x1="63" y1="20" x2="45" y2="12" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>
        <line x1="45" y1="12" x2="27" y2="20" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>
        <line x1="27" y1="20" x2="22" y2="38" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>
        <line x1="22" y1="38" x2="45" y2="46" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>
        <line x1="45" y1="46" x2="68" y2="55" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>
        <line x1="68" y1="55" x2="63" y2="72" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>
        <line x1="63" y1="72" x2="45" y2="79" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>
        <line x1="45" y1="79" x2="27" y2="72" stroke={lineColor} strokeWidth="1.3" opacity={lineOpacity}/>

        {/* Outer nodes */}
        <circle className="node-flicker-1" cx="63" cy="20" r="4.5" fill={nodeColor}/>
        <circle cx="45" cy="12" r="3"   fill={nodeColor} opacity="0.75"/>
        <circle className="node-flicker-2" cx="27" cy="20" r="3.8" fill={nodeColor} opacity="0.9"/>
        <circle cx="22" cy="38" r="2.8" fill={nodeColor} opacity="0.65"/>
        <circle cx="68" cy="55" r="2.8" fill={nodeColor} opacity="0.65"/>
        <circle className="node-flicker-3" cx="63" cy="72" r="3.8" fill={nodeColor} opacity="0.9"/>
        <circle cx="45" cy="79" r="3"   fill={nodeColor} opacity="0.75"/>
        <circle className="node-flicker-4" cx="27" cy="72" r="4.5" fill={nodeColor}/>

        {/* Centre hub – ring adapts to theme */}
        <circle cx="45" cy="46" r="5.5" fill={coreRingFill}/>
        <circle cx="45" cy="46" r="2.5" fill={coreDotFill}/>
      </svg>

      {/* TEXT */}
      {!iconOnly && (
        <div className="logo-text flex flex-col logo-text-glow">
          <div className="flex items-baseline gap-2">
            <span className={`${s.text} font-light tracking-tighter text-[var(--foreground)] uppercase`}>
              Sentra
            </span>
            <span className={`${s.text} font-black text-[#D97706]`}>AI</span>
          </div>
          <div className={`${s.sub} tracking-[0.3em] ${textMutedClass} opacity-70 uppercase font-black`}>
            Intelligent at the center
          </div>
        </div>
      )}
    </div>
  );
};
