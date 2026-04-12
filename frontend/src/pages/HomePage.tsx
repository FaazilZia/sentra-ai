
import { useEffect, useState } from 'react';
import { Navbar, Hero, FeatureGrid, CtaBanner, Footer } from '../components/sections/HomeSections';
import { HowItWorks, ProblemSolution, LivePreview, UseCases, TrustSecurity } from '../components/sections/ExtendedSections';
import AtomBackground from '../components/ui/AnimatedBackground';

const CursorLight = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[999] opacity-30"
      style={{
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(37, 99, 235, 0.05), transparent 80%)`,
      }}
    />
  );
};

const HomePage = () => {
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }

    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-white transition-colors duration-500">
      <AtomBackground />
      <CursorLight />
      <Navbar />

      <main>
        <Hero />

        <div className="relative">
          <ProblemSolution />
          <FeatureGrid />
          <LivePreview />
          <HowItWorks />
          <UseCases />
          <TrustSecurity />
          <CtaBanner />
        </div>
      </main>

      <Footer />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            html.dark body,
            html.dark .bg-white { background-color: #0b1120 !important; }
            html.dark .bg-transparent { background-color: transparent !important; }
            html.dark .min-h-screen.bg-white { background-color: #0b1120 !important; }

            html.dark .text-slate-900 { color: #f1f5f9 !important; }
            html.dark .text-slate-800 { color: #e2e8f0 !important; }
            html.dark .text-slate-700 { color: #cbd5e1 !important; }
            html.dark .text-slate-600 { color: #94a3b8 !important; }
            html.dark .text-slate-500 { color: #64748b !important; }
            html.dark .text-slate-400 { color: #64748b !important; }
            html.dark h1, html.dark h2, html.dark h3, html.dark h4 { color: #f1f5f9; }

            html.dark .glass-card {
              background-color: rgba(15, 23, 42, 0.7) !important;
              border-color: rgba(51, 65, 85, 0.5) !important;
            }
            html.dark .bg-slate-50 { background-color: #1e293b !important; }
            html.dark .bg-slate-100 { background-color: #1e293b !important; }
            html.dark .bg-blue-50\\/30,
            html.dark .bg-blue-50\\/50 { background-color: rgba(30, 58, 138, 0.2) !important; }

            html.dark .border-slate-100,
            html.dark .border-slate-200,
            html.dark .border-white\\/60,
            html.dark .border-white\\/20 { border-color: rgba(51, 65, 85, 0.5) !important; }

            html.dark nav.bg-white\\/40,
            html.dark .bg-white\\/40 { background-color: rgba(15, 23, 42, 0.6) !important; }
            html.dark .bg-white\\/95 { background-color: rgba(15, 23, 42, 0.95) !important; }

            html.dark footer.bg-white { background-color: #0f172a !important; }

            html.dark .bg-black { background-color: #e2e8f0 !important; }
            html.dark .border-black\\/20 { border-color: rgba(226, 232, 240, 0.25) !important; }
            html.dark .shadow-\\[0_0_15px_rgba\\(0\\,0\\,0\\,0\\.2\\)\\] {
              box-shadow: 0 0 15px rgba(226, 232, 240, 0.3) !important;
            }

            html.dark .molecule-element svg {
              filter: invert(1);
            }

            html.dark * {
              transition: background-color 0.4s ease, color 0.3s ease, border-color 0.4s ease;
            }
          `,
        }}
      />
    </div>
  );
};

export default HomePage;
