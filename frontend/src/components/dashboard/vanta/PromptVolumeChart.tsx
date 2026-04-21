import { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const rawData = [
  { day: 'Mon', total: 4000, highRisk: 240 },
  { day: 'Tue', total: 3000, highRisk: 139 },
  { day: 'Wed', total: 2000, highRisk: 980 },
  { day: 'Thu', total: 2780, highRisk: 390 },
  { day: 'Fri', total: 1890, highRisk: 480 },
  { day: 'Sat', total: 2390, highRisk: 380 },
  { day: 'Sun', total: 3490, highRisk: 430 },
];

export function PromptVolumeChart() {
  const data = useMemo(() => rawData, []);

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">AI Prompt Volume</h3>
          <p className="text-sm text-slate-400">Total usage vs High-risk detection</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400"></span> Total Prompts
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> High Risk
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#22d3ee" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
              activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
            />
            <Area 
              type="monotone" 
              dataKey="highRisk" 
              stroke="#f43f5e" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRisk)" 
              activeDot={{ r: 6, fill: '#f43f5e', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
