import { Activity } from 'lucide-react';

interface DataChartEmptyProps {
  title: string;
  description?: string;
}

export function DataChartEmpty({ title, description }: DataChartEmptyProps) {
  // Empty data just to render the axes
  return (
    <div className="bg-white/6 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-slate-950/20 flex flex-col items-stretch col-span-1 lg:col-span-2">
      <div className="p-5 border-b border-white/10 bg-white/4">
        <h3 className="font-semibold text-slate-100 leading-none">{title}</h3>
        {description && <p className="text-sm text-slate-400 mt-1.5">{description}</p>}
      </div>
      
      <div className="relative flex-1 p-5 min-h-[300px]">
        {/* Skeleton Bars to simulate an empty chart state */}
        <div className="absolute inset-0 p-8 pt-12 flex items-end justify-between gap-2 md:gap-4 opacity-50 pointer-events-none px-12">
          {[40, 70, 45, 90, 65, 80, 50, 30].map((h, i) => (
            <div key={i} className="w-full bg-white/10 rounded-t-sm animate-pulse" style={{ height: `${h}%` }}></div>
          ))}
        </div>
        
        {/* The overlay centered message & button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="bg-slate-950/55 backdrop-blur-xl border border-white/10 shadow-xl shadow-slate-950/30 rounded-2xl p-6 flex flex-col items-center max-w-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner shadow-white/10">
              <Activity className="w-7 h-7 text-cyan-200" />
            </div>
            <h4 className="text-slate-100 font-semibold mb-1">Awaiting Telemetry</h4>
            <p className="text-sm text-slate-400 mb-5">
              No data available in selected period. Connect your observability tool to stream live traces.
            </p>
            <button className="bg-cyan-300/12 border border-cyan-200/15 text-cyan-50 font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-cyan-300/18 transition-all shadow-sm hover:shadow-lg hover:shadow-cyan-950/20 active:scale-95 backdrop-blur-md">
              Connect Data Source
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
