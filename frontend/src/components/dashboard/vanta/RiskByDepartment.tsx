import { cn } from '@/lib/utils';

const departments = [
  { name: 'Engineering', low: 145, medium: 23, high: 12 },
  { name: 'Sales', low: 450, medium: 89, high: 45 },
  { name: 'Marketing', low: 230, medium: 45, high: 18 },
  { name: 'HR', low: 89, medium: 12, high: 2 },
];

export function RiskByDepartment() {
  return (
    <div className="flex flex-col rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white">Risk by Department</h3>
        <p className="text-sm text-slate-400">Violation severity distribution</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-xs uppercase text-slate-400">
            <tr>
              <th className="rounded-tl-lg px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold text-center">Low</th>
              <th className="px-4 py-3 font-semibold text-center">Medium</th>
              <th className="rounded-tr-lg px-4 py-3 font-semibold text-center">High</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept, idx) => (
              <tr 
                key={dept.name} 
                className={cn(
                  "border-b border-white/5 transition hover:bg-white/[0.02]",
                  idx === departments.length - 1 ? "border-none" : ""
                )}
              >
                <td className="px-4 py-4 font-medium text-white">{dept.name}</td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">
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
