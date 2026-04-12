'use client';

import React from 'react';
import { ShieldCheck, Lock, Activity, Database, Key } from 'lucide-react';

export const TrustBar = () => {
  const trustItems = [
    { label: 'DPDP Compliant', icon: ShieldCheck },
    { label: 'Zero Data Retention', icon: Key },
    { label: '99.9% Uptime SLA', icon: Activity },
    { label: 'End-to-End Encrypted', icon: Lock },
  ];

  return (
    <section className="py-12 bg-slate-900/50 border-t border-b border-slate-800 flex justify-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="flex flex-wrap justify-center lg:justify-between items-center gap-x-8 gap-y-6">
          {trustItems.map(item => (
            <div key={item.label} className="flex items-center gap-2 text-slate-300">
              <item.icon size={18} className="text-cyan-500" />
              <span className="text-[13px] font-bold uppercase tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
