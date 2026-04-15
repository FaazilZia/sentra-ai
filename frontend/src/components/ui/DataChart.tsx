import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { SurfaceCard } from './SurfaceCard';

const data = [
  { day: 'D1',  threats: 18,  mitigated: 10, scans: 120 },
  { day: 'D4',  threats: 55,  mitigated: 28, scans: 150 },
  { day: 'D7',  threats: 38,  mitigated: 22, scans: 180 },
  { day: 'D10', threats: 95,  mitigated: 60, scans: 210 },
  { day: 'D13', threats: 72,  mitigated: 55, scans: 240 },
  { day: 'D16', threats: 148, mitigated: 110, scans: 310 },
  { day: 'D19', threats: 195, mitigated: 160, scans: 350 },
  { day: 'D22', threats: 162, mitigated: 132, scans: 280 },
  { day: 'D25', threats: 210, mitigated: 178, scans: 420 },
  { day: 'D28', threats: 188, mitigated: 155, scans: 390 },
  { day: 'D30', threats: 240, mitigated: 210, scans: 480 },
];

interface DataChartProps {
  title: string;
  description: string;
  className?: string;
}

export function DataChart({ title, description, className }: DataChartProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'mitigated'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', color: '#6366f1' },
    { id: 'threats', label: 'Threats', color: '#f43f5e' },
    { id: 'mitigated', label: 'Mitigated', color: '#10b981' },
  ];

  return (
    <SurfaceCard
      title={title}
      description={description}
      className={cn("col-span-1 lg:col-span-2", className)}
      contentClassName="p-0"
      action={
        <div className="flex bg-slate-100 p-0.5 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                activeTab === tab.id 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-64 w-full p-4 pt-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tabs.find(t => t.id === activeTab)?.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={tabs.find(t => t.id === activeTab)?.color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                {activeTab === 'overview' && (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="threats" 
                      stroke="#f43f5e" 
                      fillOpacity={1} 
                      fill="transparent" 
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mitigated" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="transparent" 
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </>
                )}
                {activeTab === 'threats' && (
                  <Area 
                    type="monotone" 
                    dataKey="threats" 
                    stroke="#f43f5e" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                )}
                {activeTab === 'mitigated' && (
                  <Area 
                    type="monotone" 
                    dataKey="mitigated" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex border-t border-slate-100 bg-slate-50/50 px-4 py-3 items-center justify-between">
         <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
               <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Threats Detected</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Auto Mitigated</span>
            </div>
         </div>
         <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
            v2.0 Sync Active
         </span>
      </div>
    </SurfaceCard>
  );
}
