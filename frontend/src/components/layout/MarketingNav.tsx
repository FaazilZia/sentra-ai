import { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, ChevronRight, Menu, X } from 'lucide-react';

export function MarketingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  
  // Transition background from transparent to an opaque dark blue/frost on scroll
  const navBg = useTransform(scrollY, [0, 80], ['rgba(12, 19, 36, 0)', 'rgba(12, 19, 36, 1)']);
  const navBackdropBlur = useTransform(scrollY, [0, 80], ['blur(0px)', 'blur(20px)']);

  const links = [
    { name: 'Platform', path: '/#platform' },
    { name: 'Features', path: '/features' },
    { name: 'Docs', path: '/#docs' },
    { name: 'Blog', path: '/#blog' },
  ];

  return (
    <motion.nav
      style={{ backgroundColor: navBg as any, backdropFilter: navBackdropBlur as any }}
      className="fixed top-0 inset-x-0 z-[100] border-b border-white/[0.05] transition-colors pointer-events-auto"
    >
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-[84px] flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => {
            if (window.location.pathname === '/') {
              window.location.reload();
            } else {
              window.location.href = '/';
            }
          }}
          className="logowrap logo-container flex items-center gap-3 group pointer-events-auto"
        >
          {/* SVG */}
          <svg className="logo-svg w-[48px] h-[56px]" viewBox="13 8 65 75" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="63" y1="20" x2="45" y2="12" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
            <line x1="45" y1="12" x2="27" y2="20" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
            <line x1="27" y1="20" x2="22" y2="38" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
            <line x1="22" y1="38" x2="45" y2="46" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
            <line x1="45" y1="46" x2="68" y2="55" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
            <line x1="68" y1="55" x2="63" y2="72" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
            <line x1="63" y1="72" x2="45" y2="79" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>
            <line x1="45" y1="79" x2="27" y2="72" stroke="#F59E0B" strokeWidth="1.1" opacity="0.3"/>

            <circle className="n1" cx="63" cy="20" r="4.5" fill="#F59E0B"/>
            <circle cx="45" cy="12" r="3" fill="#F59E0B" opacity="0.65"/>
            <circle className="n2" cx="27" cy="20" r="3.8" fill="#F59E0B" opacity="0.85"/>
            <circle cx="22" cy="38" r="2.8" fill="#F59E0B" opacity="0.6"/>
            <circle cx="45" cy="46" r="5.5" fill="#FFFFFF"/>
            <circle cx="45" cy="46" r="2.5" fill="#F59E0B"/>
            <circle cx="68" cy="55" r="2.8" fill="#F59E0B" opacity="0.6"/>
            <circle className="n3" cx="63" cy="72" r="3.8" fill="#F59E0B" opacity="0.85"/>
            <circle cx="45" cy="79" r="3" fill="#F59E0B" opacity="0.65"/>
            <circle className="n4" cx="27" cy="72" r="4.5" fill="#F59E0B"/>
          </svg>

          {/* TEXT */}
          <div className="logo-text flex flex-col text-left hidden sm:flex">
            <div className="flex items-baseline gap-1.5" style={{ lineHeight: 1.1 }}>
              <span className="logo-word-sentra font-sans text-[26px] font-bold tracking-[0.1em] text-white uppercase">Sentra</span>
              <span className="logo-word-ai font-sans text-[26px] font-bold text-[#F59E0B]">AI</span>
            </div>
            <div className="logo-subtext text-[9px] font-light tracking-[0.22em] text-white/40 uppercase mt-0.5">
              Intelligent at the center
            </div>
          </div>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-[0.88rem]">
          {links.map(l => {
            const isActive = location.pathname === l.path || (location.pathname === '/' && l.path.startsWith('/#'));
            return (
            <button
              key={l.name}
              onClick={() => {
                if (l.path.startsWith('/#')) {
                  window.location.href = l.path;
                } else {
                  navigate(l.path);
                }
              }}
              className={`transition-colors duration-200 pointer-events-auto ${isActive ? 'text-white font-medium' : 'text-white/50 hover:text-white'}`}
            >
                {l.name}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="text-[0.88rem] text-white/50 hover:text-white transition-colors">Log in</button>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 rounded-full bg-[#c6c6c7] text-[#2f3131] px-5 py-2 text-[0.88rem] font-semibold hover:bg-white transition-all active:scale-95 pointer-events-auto"
          >
            Get Started <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hamburger */}
        <button className="md:hidden text-white/60 hover:text-white p-2 pointer-events-auto" onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0c1324]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-5 space-y-4 shadow-2xl">
          {links.map(l => {
             const isActive = location.pathname === l.path;
             return (
              <button
                key={l.name}
                onClick={() => {
                  setMenuOpen(false);
                  if (l.path.startsWith('/#') && location.pathname !== '/') {
                    navigate('/');
                    setTimeout(() => window.location.hash = l.path.replace('/', ''), 100);
                  } else if (l.path.startsWith('/#')) {
                    window.location.hash = l.path.replace('/', '');
                  } else {
                    navigate(l.path);
                  }
                }}
                className={`block w-full text-left text-lg py-2 pointer-events-auto ${isActive ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}
              >
                {l.name}
              </button>
             );
          })}
          <hr className="border-white/10 my-4" />
          <button onClick={() => navigate('/login')} className="block w-full text-left text-lg py-2 text-white/60 hover:text-white pointer-events-auto">Log in</button>
          <button onClick={() => navigate('/login')} className="w-full rounded-full bg-[#c6c6c7] text-[#2f3131] py-3.5 text-base font-semibold mt-4 active:scale-95 transition-transform pointer-events-auto">
            Get Started
          </button>
        </div>
      )}
    </motion.nav>
  );
}
