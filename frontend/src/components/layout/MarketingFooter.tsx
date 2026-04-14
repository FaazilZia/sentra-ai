import React from 'react';
import { Activity } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.05] bg-[#0c1324] px-6 py-20 text-white">
      <div className="max-w-screen-xl mx-auto lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#0c1324]" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-[0.95rem] tracking-[-0.01em]">Sentra AI</span>
            </div>
            <p className="text-white/30 text-[0.85rem] leading-relaxed max-w-[260px] font-inter">
              The control plane for enterprise AI security, governance, and observability.
            </p>
          </div>
          {[
            { title: 'Product', links: ['Platform', 'Features', 'Security', 'Compliance'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
          ].map(({ title, links }) => (
            <div key={title} className="flex flex-col gap-4">
              <p className="text-[0.85rem] font-semibold text-white/50">{title}</p>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l}>
                    <a href="#" className="font-inter text-[0.88rem] text-white/30 hover:text-white/70 transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5 text-[0.8rem] text-white/20 font-inter">
          <p>© {new Date().getFullYear()} Sentra AI Inc. All rights reserved.</p>
          <div className="flex gap-6">
            {['X / Twitter', 'GitHub', 'LinkedIn'].map(s => (
              <a key={s} href="#" className="hover:text-white/60 transition-colors">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
