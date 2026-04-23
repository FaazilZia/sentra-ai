import { cn } from '@/lib/utils';
import type { DepartmentData } from '@/hooks/useDashboardData';

export function RiskByDepartment({ data }: { data: DepartmentData[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white">Risk by Department</h3>
        <p className="text-sm text-slate-300">Violation severity distribution</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-100">
          <thead className="bg-white/5 text-xs uppercase text-slate-300">
            <tr>
              <th className="rounded-tl-lg px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold text-center">Low</th>
              <th className="px-4 py-3 font-semibold text-center">Medium</th>
              <th className="rounded-tr-lg px-4 py-3 font-semibold text-center">High</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  No department risk data available
                </td>
              </tr>
            ) : data.map((dept, idx) => (
              <tr 
                key={dept.name} 
                className={cn(
                  "border-b border-white/5 transition hover:bg-white/[0.02]",
                  idx === data.length - 1 ? "border-none" : ""
                )}
              >
                <td className="px-4 py-4 font-medium text-white">{dept.name}</td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-100">
                    {dept.low}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    {dept.medium}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={cn(
                    "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                    dept.high > 20 ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50" : "bg-rose-500/10 text-rose-400"
                  )}>
                    {dept.high}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
