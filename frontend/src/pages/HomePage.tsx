'use client';


import { ReactLenis } from '@studio-freight/react-lenis';

import { Navbar } from '../components/sections/HomeSections';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { BentoFeatures } from '../components/landing/BentoFeatures';
import { PlaygroundBanner } from '../components/landing/PlaygroundBanner';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FAQSection } from '../components/landing/FAQSection';
import { SecuritySection } from '../components/landing/SecuritySection';
import { TrustBar } from '../components/landing/TrustBar';
import { FinalCTA } from '../components/landing/FinalCTA';
import { WaitlistCTA } from '../components/landing/WaitlistCTA';
import { FooterSection } from '../components/landing/FooterSection';
import { CookieBanner } from '../components/landing/CookieBanner';
import { FloatingMolecules } from '../components/ui/FloatingMolecules';

/**
 * Clean Background Layer
 * Minimalist, high-end dark theme matching #0d1117 (GitHub dark style) with subtle overlays.
 */
const BackgroundLayer = () => (
  <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
    {/* Dark Base - Royal SaaS Blue Transition */}
    <div className="absolute inset-0 bg-[#3563E9]" />
    
    {/* High-Depth Gradient Layer - To keep it premium */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#4A78FF_0%,#3563E9_50%,#1A36A8_100%)]" />
    
    {/* Animated Molecules - Directly on top of base */}
    <FloatingMolecules />
    
    {/* Subtle top-center glow */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-600/5 blur-[120px] rounded-full" />
    
    {/* Faint technical grid */}
    <div 
      className="absolute inset-0 opacity-[0.03]" 
      style={{
        backgroundImage: 'linear-gradient(rgba(0, 245, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }}
    />
  </div>
);

const HomePage = () => {
  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      <div className="relative min-h-screen text-white selection:bg-cyan-600/30 antialiased font-sans flex flex-col">
        <BackgroundLayer />
        
        <Navbar />

        <main className="flex-grow">
          {/* 1. Hero Section */}
          <HeroSection />

          {/* 2. Features Section (4 Cards) */}
          <FeaturesSection />

          {/* 3. Expanded Feature Section (Bento Grid) */}
          <BentoFeatures />

          {/* 4. Live Demo / Playground Banner */}
          <PlaygroundBanner />

          {/* 5. How It Works (3 Steps) */}
          <HowItWorks />

          {/* 6. FAQ Section */}
          <FAQSection />

          {/* 11. Security Section */}
          <SecuritySection />

          {/* 12. Trust & Compliance Bar */}
          <TrustBar />

          {/* 13. Final CTA */}
          <FinalCTA />

          {/* 14. Newsletter / Waitlist CTA */}
          <WaitlistCTA />
        </main>
        
        {/* 15. Footer Improvements */}
        <FooterSection />

        {/* 16. Cookie Consent Banner */}
        <CookieBanner />
      </div>

      <style>{`
        html, body { 
          background-color: #3563E9; 
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        section {
          position: relative;
          z-index: 10;
        }

        h1, h2, h3, h4 {
          letter-spacing: -0.02em;
        }

        p {
          color: rgba(248, 255, 250, 0.8) !important;
        }

        button {
          transition: all 0.3s ease;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #3563E9;
        }
        ::-webkit-scrollbar-thumb {
          background: #1A36A8;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4A78FF;
        }
      `}</style>
    </ReactLenis>
  );
};

export default HomePage;
