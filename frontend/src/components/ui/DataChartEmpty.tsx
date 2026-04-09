import { Activity } from 'lucide-react';

interface DataChartEmptyProps {
  title: string;
  description?: string;
}

export function DataChartEmpty({ title, description }: DataChartEmptyProps) {
  return (
    <div className="col-span-1 flex flex-col items-stretch overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/6 shadow-lg shadow-slate-950/20 backdrop-blur-xl lg:col-span-2">
      <div className="p-5 border-b border-white/10 bg-white/4">
        <h3 className="font-semibold text-slate-100 leading-none">{title}</h3>
        {description && <p className="text-sm text-slate-400 mt-1.5">{description}</p>}
      </div>

      <div className="relative flex-1 p-5 min-h-[300px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.09),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.08),transparent_24%)]" />
        <div className="absolute inset-0 p-8 pt-12 flex items-end justify-between gap-2 md:gap-4 opacity-50 pointer-events-none px-12">
          {[40, 70, 45, 90, 65, 80, 50, 30].map((h, i) => (
            <div key={i} className="w-full bg-white/10 rounded-t-sm animate-pulse" style={{ height: `${h}%` }}></div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6 text-center shadow-xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner shadow-white/10 backdrop-blur-md">
              <Activity className="w-7 h-7 text-cyan-200" />
            </div>
            <h4 className="text-slate-100 font-semibold mb-1">Awaiting Telemetry</h4>
            <p className="mb-5 text-sm leading-6 text-slate-400">
              No data is available in the selected period. Connect your observability layer to light
              up risk trends, trace anomalies, and policy outcomes here.
            </p>
            <button className="rounded-xl border border-cyan-200/15 bg-cyan-300/12 px-5 py-2.5 text-sm font-medium text-cyan-50 shadow-sm transition-all hover:bg-cyan-300/18 hover:shadow-lg hover:shadow-cyan-950/20 active:scale-95 backdrop-blur-md">
              Connect Data Source
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
