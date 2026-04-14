export const BackgroundLayer = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-[#020617] overflow-hidden pointer-events-none">
      {/* Primary Deep Navy Base */}
      <div className="absolute inset-0 bg-[#020617]" />
      
      {/* Animated Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Cyber Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* Subtle Data Particles Decor */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-blue-400 rounded-full blur-[2px] opacity-20 animate-ping" />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-indigo-400 rounded-full blur-[2px] opacity-20 animate-ping" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-blue-300 rounded-full blur-[2px] opacity-20 animate-ping" style={{ animationDelay: '3s' }} />
      </div>
    </div>
  );
};
