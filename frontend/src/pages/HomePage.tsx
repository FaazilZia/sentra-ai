import { Reveal } from '../ui/Reveal';
import { BackgroundLayer } from '../components/ui/BackgroundLayer';
import { HeroSection } from '../components/landing/HeroSection';
import { HowItWorks, ProblemSolution, LivePreview, UseCases, TrustSecurity } from '../components/sections/ExtendedSections';
import { FinalCTA } from '../components/landing/FinalCTA';

const HomePage = () => {
  return (
    <div className="min-h-screen selection:bg-blue-500/30">
      <BackgroundLayer />
      
      <main className="relative z-10">
        <HeroSection />
        
        <Reveal yOffset={0}>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        </Reveal>
        
        <ProblemSolution />
        <LivePreview />
        <HowItWorks />
        <UseCases />
        <TrustSecurity />
        
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full -z-10" />
          <FinalCTA />
        </div>
      </main>
    </div>
  );
};

export default HomePage;
