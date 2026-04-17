import React from 'react';
import { Shield, TrendingUp, AlertCircle } from 'lucide-react';

interface SecurityScoreCardProps {
  score: number;
}

export const SecurityScoreCard: React.FC<SecurityScoreCardProps> = ({ score }) => {
  const getStatusColor = () => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (score >= 50) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-rose-500 bg-rose-50 border-rose-100';
  };

  const getRingColor = () => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 50) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            Governance Integrity Score
          </h3>
          <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest">
            Overall Security Health
          </p>
        </div>
        <div className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tighter ${getStatusColor()}`}>
          {score >= 80 ? 'Optimal' : score >= 50 ? 'Warning' : 'Critical'}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="transparent"
              className={getRingColor()}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - score / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-2xl font-black text-slate-900 leading-none">{score}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-slate-700 leading-tight">Proactive Blocking</p>
              <p className="text-[10px] text-slate-500 font-medium">92% of high-risk actions intercepted</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-slate-700 leading-tight">Policy Coverage</p>
              <p className="text-[10px] text-slate-500 font-medium">8 active agents fully monitored</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          Last calculation: Just now
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse delay-75" />
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse delay-150" />
        </div>
      </div>
    </div>
  );
};
