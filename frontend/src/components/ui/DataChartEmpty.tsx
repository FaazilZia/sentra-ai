import { Box } from 'lucide-react';

interface DataChartEmptyProps {
  title: string;
  description?: string;
}

export function DataChartEmpty({ title, description }: DataChartEmptyProps) {
  return (
    <div className="col-span-1 flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 lg:col-span-2">
      <div className="border-b border-slate-200 bg-white p-3">
        <h3 className="text-base font-semibold leading-5 text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-[10px] leading-4 text-slate-400">{description}</p> : null}
      </div>

      <div className="relative min-h-[260px] flex-1 p-3">
        <div className="absolute inset-0 px-8 pb-8 pt-12">
          <div className="flex h-full items-end justify-between gap-2 border-b border-l border-slate-200 pl-3">
            {[44, 72, 51, 86, 63, 76, 48, 35].map((height, index) => (
              <div
                key={index}
                className="w-full rounded-t-md bg-slate-100"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-sm rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300">
              <Box className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-900">Nothing to see here — yet</h4>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Connect a scan source or configure an integration to populate this trend.
            </p>
            <button className="mt-4 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">
              Configure Integration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
