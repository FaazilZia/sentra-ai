import React from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface DashboardHeaderProps {
  total: number;
  allowed: number;
  blocked: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ total, allowed, blocked }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-slate-100 rounded-lg">
          <Shield className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Actions</p>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-green-50 rounded-lg">
          <ShieldCheck className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Allowed Actions</p>
          <p className="text-2xl font-bold text-green-600">{allowed}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-red-50 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Blocked Actions</p>
          <p className="text-2xl font-bold text-red-600">{blocked}</p>
        </div>
      </div>
    </div>
  );
};
