import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, ChevronRight, Menu, X } from 'lucide-react';

export function MarketingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  
  // Transition background from transparent to an opaque dark blue/frost on scroll
  const navBg = useTransform(scrollY, [0, 80], ['rgba(46, 52, 71, 0.1)', 'rgba(46, 52, 71, 0.4)']);
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
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group pointer-events-auto">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#0c1324]" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-[0.95rem] tracking-[-0.01em] text-white">Sentra AI</span>
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
