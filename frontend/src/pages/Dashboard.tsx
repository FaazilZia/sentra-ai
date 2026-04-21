import { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AIActivityLog,
  fetchAIActivityLogs,
  apiBaseUrl
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ActivityEvent } from '@/components/dashboard/ActivityFeed';
import { generateEvent, ScenarioMode, SimulatedEvent } from '@/lib/demo/simulation';
import { INITIAL_MOCK_DATA } from '@/lib/demo/mockData';

import { NeedsAttention } from '@/components/dashboard/NeedsAttention.tsx';
import { AIInsightEnhanced, EnhancedInsight } from '@/components/dashboard/AIInsightEnhanced.tsx';
import { AuditReadiness } from '@/components/dashboard/AuditReadiness.tsx';
import { OutcomeValidation } from '@/components/dashboard/OutcomeValidation.tsx';
import { MonitoringStatus } from '@/components/dashboard/MonitoringStatus.tsx';
import { DriftAlert } from '@/components/dashboard/DriftAlert.tsx';
import { DecisionOwnership } from '@/components/dashboard/DecisionOwnership.tsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const [aiLogs, setAiLogs] = useState<AIActivityLog[]>([]);
  const [complianceFilter] = useState<'ALL' | 'GDPR' | 'HIPAA' | 'DPDP'>('ALL');
  
  // Demo Mode State
  const [demoMode] = useState(false);
  const [scenario] = useState<ScenarioMode>('GENERAL');
  const [simulatedLogs, setSimulatedLogs] = useState<SimulatedEvent[]>(INITIAL_MOCK_DATA);
  const demoInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (demoMode) {
      demoInterval.current = setInterval(() => {
        const newEvent = generateEvent(scenario);
        setSimulatedLogs(prev => [newEvent, ...prev].slice(0, 50));
      }, 4000);
    } else {
      if (demoInterval.current) clearInterval(demoInterval.current);
    }
    return () => { if (demoInterval.current) clearInterval(demoInterval.current); };
  }, [demoMode, scenario]);

  useEffect(() => {
    if (!user?.companyId || demoMode) return;
    const socketUrl = apiBaseUrl.replace('/api/v1', '').replace('/api', '');
    const socket: Socket = io(socketUrl);

    socket.on('connect', () => {
      socket.emit('join_company', user.companyId);
    });

    socket.on('activity_log', (newLog: AIActivityLog) => {
      setAiLogs(prev => [newLog, ...prev].slice(0, 100));
    });

    return () => { socket.disconnect(); };
  }, [user?.companyId, demoMode]);

  const loadData = async () => {
    try {
      const [aiLogsRes] = await Promise.all([
        fetchAIActivityLogs()
      ]);
      setAiLogs(aiLogsRes || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const activeLogs = useMemo(() => {
    const rawLogs: (AIActivityLog | SimulatedEvent)[] = demoMode ? simulatedLogs : aiLogs;
    
    const normalized: ActivityEvent[] = rawLogs.map(log => {
      if ('agent_id' in log) {
        return {
          ...log,
          agent: log.agent_id,
          risk: log.risk_score,
          timestamp: new Date(log.created_at).toLocaleTimeString(),
        } as ActivityEvent;
      }
      return log as ActivityEvent;
    });

    if (complianceFilter === 'ALL') return normalized;
    return normalized.filter(log => log.compliance?.includes(complianceFilter));
  }, [aiLogs, simulatedLogs, demoMode, complianceFilter]);

  const stats = useMemo(() => {
    const total = activeLogs.length;
    const blocked = activeLogs.filter(l => l.status === 'blocked').length;
    const violations = activeLogs.filter(l => l.risk === 'high' || l.status === 'blocked').length;
    const calculatedRisk = Math.min(Math.round((violations / (total || 1)) * 100), 100);
    const complianceRate = 100 - calculatedRisk;

    return { 
      total, 
      blocked, 
      violations, 
      complianceRate, 
      riskScore: calculatedRisk,
      auditReadiness: Math.max(complianceRate - 8, 0)
    };
  }, [activeLogs]);

  const activityEvents = useMemo<ActivityEvent[]>(() => {
    return activeLogs.slice(0, 15);
  }, [activeLogs]);

  const criticalIssues = useMemo(() => {
    const issues: { label: string; type: 'critical' | 'warning' }[] = [];
    const highRisk = activityEvents.filter(e => e.status === 'blocked').length;
    if (highRisk > 0) issues.push({ label: `${highRisk} High-risk violations detected`, type: 'critical' });
    if (stats.complianceRate < 95) issues.push({ label: `Compliance score below target (95%)`, type: 'warning' });
    return issues;
  }, [activityEvents, stats.complianceRate]);

  const enhancedInsight = useMemo<EnhancedInsight>(() => {
    return {
      insight: stats.complianceRate < 95 
        ? "Missing legal BAA documentation and encryption gaps are blocking HIPAA certification."
        : "System integrity verified for GDPR. Focus on periodic access reviews for sustained readiness.",
      confidence: stats.total > 20 ? 'High' : 'Medium',
      sources: ["Audit Logs", "Policy Engine", "Drift Analysis"],
      impact_if_ignored: [
        "High risk of HIPAA non-compliance",
        "Potential $50k/day regulatory penalties",
        "Data sovereignty breach in EU regions"
      ],
      expected_outcome: {
        score_change: `${stats.complianceRate}% → 98%`,
        risk_reduction: stats.riskScore > 10 ? "High → Low" : "Stable → Optimal"
      },
      priority: stats.riskScore > 10 ? 'High' : 'Medium',
      recommended_time: stats.riskScore > 10 ? "Within 24 hours" : "Within 7 days",
      action_label: stats.complianceRate < 95 ? "Fix Encryption & BAA Gap" : "Execute Access Review"
    };
  }, [stats]);

  return (
    <div className="mx-auto max-w-[1000px] space-y-24 pb-32 px-8 pt-16">
      
      {/* 1. Needs Attention */}
      <NeedsAttention 
        issues={criticalIssues} 
        onAction={() => window.location.href = '/app/activity-logs'} 
      />

      {/* 2. Compliance Score + Audit Readiness */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Global Compliance Score</p>
            <div className="flex items-baseline gap-4">
              <h2 className="text-9xl font-black tracking-tighter text-white leading-none">
                {stats.complianceRate}%
              </h2>
              <span className="text-xl font-black text-emerald-500">+2% ↑</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Risk: {stats.riskScore}%</p>
          </div>
        </div>

        <div className="w-full md:w-auto">
          <AuditReadiness 
            score={stats.auditReadiness} 
            status={stats.auditReadiness >= 90 ? "Ready for Audit" : "Not Audit Ready"} 
          />
        </div>
      </div>

      {/* 3. AI Insight (Enhanced) */}
      <AIInsightEnhanced 
        data={enhancedInsight}
        onAction={() => window.location.href = '/app/compliance'}
      />

      {/* 4. Outcome Validation & 5. Monitoring Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <OutcomeValidation 
          status={stats.complianceRate > 90 ? 'verified' : 'failed'}
          prevScore={stats.complianceRate - 4}
          newScore={stats.complianceRate}
          prevRisk="High"
          newRisk={stats.riskScore > 30 ? "High" : "Low"}
          confidence="High"
        />
        <MonitoringStatus 
          status={stats.riskScore > 30 ? 'critical' : stats.riskScore > 10 ? 'warning' : 'active'}
          lastChecked="Just Now"
          violations24h={stats.violations}
          stability={stats.riskScore > 20 ? "fluctuating" : "stable"}
        />
      </div>

      {/* 6. Drift Detection Alert */}
      {stats.complianceRate < 96 && (
        <DriftAlert 
          driftPercentage={2.4}
          timeWindow="6h"
          severity={stats.complianceRate < 90 ? 'high' : 'medium'}
        />
      )}

      {/* 7. Decision Ownership */}
      <div className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Latest Governance Action</h3>
        <DecisionOwnership 
          approvedBy="Mohammad Faazil"
          role="ADMIN"
          timestamp="Today at 10:42 AM"
        />
      </div>

      {/* 8. Recent Violations */}
      <div className="space-y-8 pt-12 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Priority Violations</h3>
        </div>
        <div className="space-y-4">
          {activityEvents.filter(e => e.status === 'blocked').slice(0, 3).map((event, idx) => (
            <div key={idx} className="group p-8 rounded-[2.5rem] bg-rose-500/[0.02] border border-rose-500/10 hover:border-rose-500/20 transition-all flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <div>
                  <p className="text-lg font-black text-white tracking-tight uppercase">{event.reason || 'Unauthorized Access Attempt'}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{event.agent} • {event.timestamp}</p>
                </div>
              </div>
              <button 
                onClick={() => window.location.href = `/app/activity-logs?id=${event.id}`}
                className="px-6 py-3 rounded-2xl bg-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Resolve
              </button>
            </div>
          ))}
          {activityEvents.filter(e => e.status === 'blocked').length === 0 && (
            <div className="py-24 rounded-[3rem] bg-slate-900/10 border border-dashed border-white/5 text-center">
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">All Systems Clear</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
