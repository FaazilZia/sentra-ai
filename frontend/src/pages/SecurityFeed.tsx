import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Clock, UserCheck, AlertTriangle } from 'lucide-react';
import { fetchAIActivityLogs, AIActivityLog } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';

export default function SecurityFeedPage() {
  const { user } = useAuth();
  const [pendingLogs, setPendingLogs] = useState<AIActivityLog[]>([]);
  const [highRiskLogs, setHighRiskLogs] = useState<AIActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAlerts() {
    setLoading(true);
    try {
      const logs = await fetchAIActivityLogs();
      // Filter for items that need attention:
      // 1. Pending Approval
      // 2. High Risk Blocked
      setPendingLogs(logs.filter(l => (l as any).is_pending_approval));
      setHighRiskLogs(logs.filter(l => l.risk_score === 'high' && !((l as any).is_pending_approval)));
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 pb-12 px-6 pt-8">
      {/* Alerts Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 uppercase">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          Alerts & Overrides
        </h1>
        <p className="text-slate-400 font-medium max-w-xl">
          Manage critical AI actions requiring human-in-the-loop approval or review.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Section 1: Pending Approvals (2-Step Verification) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
             <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                <Clock className="h-5 w-5" />
             </div>
             <div>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Pending 2-Step Verification</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">High risk actions awaiting Reviewer approval</p>
             </div>
          </div>

          {loading ? (
             <div className="p-12 text-center glass-card rounded-[1.5rem]">
                <div className="h-6 w-6 animate-spin border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
             </div>
          ) : pendingLogs.length === 0 ? (
             <div className="p-12 text-center glass-card rounded-[1.5rem] border-dashed bg-emerald-500/[0.01]">
                <ShieldCheck className="h-10 w-10 text-slate-800 mx-auto mb-3" />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">All critical actions resolved</p>
             </div>
          ) : (
            <ActivityFeed 
              events={pendingLogs.map(log => ({
                id: log.id,
                agent: log.agent_id,
                action: log.action,
                status: log.status as 'allowed' | 'blocked',
                risk: log.risk_score as 'low' | 'medium' | 'high',
                timestamp: new Date(log.created_at).toLocaleString(),
                reason: log.reason,
                impact: log.impact,
                compliance: log.compliance as string[],
                explanation: log.explanation,
                isPendingApproval: true
              }))} 
              minimal={true}
            />
          )}
        </div>

        {/* Section 2: High Risk Blocked Actions */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
             <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
             </div>
             <div>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">High Risk Blocks</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recent blocked actions with potential compliance impact</p>
             </div>
          </div>

          {loading ? (
             <div className="p-12 text-center glass-card rounded-[1.5rem]">
                <div className="h-6 w-6 animate-spin border-2 border-rose-500 border-t-transparent rounded-full mx-auto" />
             </div>
          ) : highRiskLogs.length === 0 ? (
             <div className="p-12 text-center glass-card rounded-[1.5rem] border-dashed">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No recent high risk blocks</p>
             </div>
          ) : (
            <ActivityFeed 
              events={highRiskLogs.map(log => ({
                id: log.id,
                agent: log.agent_id,
                action: log.action,
                status: log.status as 'allowed' | 'blocked',
                risk: log.risk_score as 'low' | 'medium' | 'high',
                timestamp: new Date(log.created_at).toLocaleString(),
                reason: log.reason,
                impact: log.impact,
                compliance: log.compliance as string[],
                explanation: log.explanation
              }))} 
              minimal={true}
            />
          )}
        </div>
      </div>

      {/* Role Badge */}
      <div className="fixed bottom-8 right-8 p-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex items-center gap-3">
         <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-slate-950">
            <UserCheck className="h-4 w-4" />
         </div>
         <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Logged in as</p>
            <p className="text-xs font-black text-white mt-0.5">{user?.role || 'USER'}</p>
         </div>
      </div>
    </div>
  );
}
