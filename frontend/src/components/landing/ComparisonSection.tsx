'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { siteContent } from '../../lib/content';
import { Check, X, Minus } from 'lucide-react';

export const ComparisonSection = () => {
  const { comparison } = siteContent;

  const renderValue = (val: string) => {
    if (val === 'Yes') return <Check className="text-blue-500 mx-auto" size={20} strokeWidth={3} />;
    if (val === 'No') return <X className="text-slate-600 mx-auto" size={20} />;
    if (val === 'Partial') return <span className="text-yellow-500 text-xs font-bold uppercase tracking-wider mx-auto">Partial</span>;
    return val;
  };

  return (
    <section className="py-24 bg-transparent border-t border-slate-800/50">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold text-center text-white tracking-tight mb-16">
          {comparison.heading}
        </h2>

        <div className="overflow-x-auto rounded-3xl border border-slate-700 bg-slate-900/60 shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-6 text-slate-400 font-medium border-b border-slate-700/50 w-1/3 min-w-[200px]">Features</th>
                <th className="p-6 text-center text-white font-bold text-lg border-b border-slate-700/50 bg-blue-600/10 min-w-[150px]">
                  Sentra AI
                </th>
                <th className="p-6 text-center text-slate-400 font-semibold border-b border-slate-700/50 min-w-[150px]">
                  LangSmith
                </th>
                <th className="p-6 text-center text-slate-400 font-semibold border-b border-slate-700/50 min-w-[150px]">
                  Generic Proxy
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-6 text-sm font-semibold text-slate-200 border-b border-slate-800/50">
                    {row.feature}
                  </td>
                  <td className="p-6 text-center border-b border-slate-800/50 bg-blue-600/5 border-l border-r border-slate-700/50">
                    {renderValue(row.sentra)}
                  </td>
                  <td className="p-6 text-center border-b border-slate-800/50">
                    {renderValue(row.langsmith)}
                  </td>
                  <td className="p-6 text-center border-b border-slate-800/50">
                    {renderValue(row.proxy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
