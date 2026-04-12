'use client';

import React from 'react';

/**
 * LogoStrip - Client Logos
 * A muted, grayscale horizontal list of trusted companies.
 */
export const LogoStrip = () => {
  const logos = ['Stripe', 'Vercel', 'Linear', 'Notion', 'Anthropic', 'Scale AI'];

  return (
    <section className="py-12 border-b border-slate-800/50 bg-transparent flex justify-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 w-full flex flex-col items-center">
        <p className="text-slate-500 text-sm font-medium tracking-wide uppercase mb-6">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {logos.map(logo => (
            <span key={logo} className="text-xl md:text-2xl font-black text-slate-400 tracking-tighter">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoStrip;
