import { Box } from 'lucide-react';

interface DataChartEmptyProps {
  title: string;
  description?: string;
}

export function DataChartEmpty({ title, description }: DataChartEmptyProps) {
  return (
    <div className="col-span-1 flex flex-col overflow-hidden rounded-xl border border-white/60 bg-white/80 shadow-[0_4px_18px_rgba(15,23,42,0.06)] backdrop-blur transition-all hover:-translate-y-1 lg:col-span-2">
      <div className="border-b border-slate-200/80 bg-white/65 p-4">
        <h3 className="text-sm font-semibold leading-none text-slate-900">{title}</h3>
        {description ? <p className="mt-1.5 text-xs text-slate-500">{description}</p> : null}
      </div>

      <div className="relative min-h-[300px] flex-1 p-5">
        <div className="absolute inset-0 px-10 pb-10 pt-14">
          <div className="flex h-full items-end justify-between gap-3 border-b border-l border-slate-200/80 pl-4">
            {[44, 72, 51, 86, 63, 76, 48, 35].map((height, index) => (
              <div
                key={index}
                className="w-full rounded-t-md bg-slate-100"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-xl border border-slate-200 bg-white/90 p-6 text-center shadow-sm backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
              <Box className="h-7 w-7" />
            </div>
            <h4 className="mt-4 text-sm font-semibold text-slate-900">Nothing to see here — yet</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Connect a scan source or configure an integration to populate this trend.
            </p>
            <button className="mt-5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">
              Configure Integration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
