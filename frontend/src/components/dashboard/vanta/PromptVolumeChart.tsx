import { 
  AreaChart, 
  Area, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import type { PromptChartData } from '@/hooks/useDashboardData';

export function PromptVolumeChart({ data }: { data: PromptChartData[] }) {
  return (
    <div className="flex w-full flex-col rounded-xl border border-white/10 bg-slate-900/50 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">7D Agent Action Volume Trend</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> Total
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> High Risk
          </div>
        </div>
      </div>
      
      <div className="h-16 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '12px',
                padding: '4px 8px'
              }}
              itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
              labelStyle={{ display: 'none' }}
              cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#22d3ee" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
              activeDot={{ r: 3, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 1 }}
            />
            <Area 
              type="monotone" 
              dataKey="highRisk" 
              stroke="#f43f5e" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#colorRisk)" 
              activeDot={{ r: 3, fill: '#f43f5e', stroke: '#0f172a', strokeWidth: 1 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
