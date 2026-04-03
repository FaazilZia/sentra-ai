import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

interface DataChartEmptyProps {
  title: string;
  description?: string;
}

export function DataChartEmpty({ title, description }: DataChartEmptyProps) {
  // Empty data just to render the axes
  return (
    <div className="bg-white/70 backdrop-blur-md border rounded-xl overflow-hidden shadow-sm flex flex-col items-stretch col-span-1 lg:col-span-2">
      <div className="p-5 border-b bg-white/40">
        <h3 className="font-semibold text-slate-900 leading-none">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-1.5">{description}</p>}
      </div>
      
      <div className="relative flex-1 p-5 min-h-[300px]">
        {/* Skeleton Bars to simulate an empty chart state */}
        <div className="absolute inset-0 p-8 pt-12 flex items-end justify-between gap-2 md:gap-4 opacity-50 pointer-events-none px-12">
          {[40, 70, 45, 90, 65, 80, 50, 30].map((h, i) => (
            <div key={i} className="w-full bg-slate-200/60 rounded-t-sm animate-pulse" style={{ height: `${h}%` }}></div>
          ))}
        </div>
        
        {/* The overlay centered message & button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col items-center max-w-sm text-center">
            <Activity className="w-10 h-10 text-slate-400 mb-3" />
            <h4 className="text-slate-900 font-semibold mb-1">Awaiting Telemetry</h4>
            <p className="text-sm text-slate-500 mb-5">
              No data available in selected period. Connect your observability tool to stream live traces.
            </p>
            <button className="bg-slate-900 text-white font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-all shadow-sm hover:shadow active:scale-95">
              Connect Data Source
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
