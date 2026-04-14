import { Activity } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.05] bg-[#0c1324] px-6 py-20 text-white">
      <div className="max-w-screen-xl mx-auto lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 flex flex-col gap-4">
            <a href="/" className="logo-container flex items-center gap-3 group w-max">
              <svg className="logo-svg w-[38px] h-[44px]" viewBox="13 8 65 75" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                <circle cx="27" cy="72" r="2" fill="#FFFFFF"/>
              </svg>
              <span className="font-manrope font-extrabold text-[1.2rem] tracking-tight leading-[1] text-white">
                <span className="logo-word-sentra">SENTRA</span> <span className="logo-word-ai text-amber-500">AI</span>
              </span>
            </a>
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
