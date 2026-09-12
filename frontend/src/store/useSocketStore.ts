import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  color: string;
  aiSummary?: string;
  decision: 'BLOCK' | 'MODIFY' | 'ALLOW';
}

export interface Alert {
  id: string;
  title: string;
  system: string;
  severity: 'critical' | 'high' | 'medium';
  time: string;
}

export interface RiskEvent {
  id: string;
  agent: string;
  action: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  time: string;
  status: 'Blocked' | 'Flagged' | 'Allowed';
  aiSummary?: string;
  reason?: string;
  frameworks?: string[];
  decision?: 'BLOCK' | 'MODIFY' | 'ALLOW';
}

export interface DriftAlert {
  id: string;
  name: string;
  type: string;
  shift: string;
  status: 'warning' | 'danger' | 'active';
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  agentName?: string;
  agentId?: string;
  message?: string;
  time?: string;
  detectedAt?: string;
}

interface SocketState {
  connectionStatus: ConnectionStatus;
  activities: Activity[];
  alerts: Alert[];
  riskEvents: RiskEvent[];
  driftAlerts: DriftAlert[];
  setConnectionStatus: (status: ConnectionStatus) => void;
  addEvent: (payload: any) => void;
  addDriftAlert: (payload: any) => void;
  setDriftAlerts: (alerts: DriftAlert[]) => void;
}

// Helper to format time nicely (e.g., "Just now" or HH:MM:SS)
const formatTime = (dateString: string) => {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'Just now';
  }
};

export const useSocketStore = create<SocketState>((set) => ({
  connectionStatus: 'disconnected',
  activities: [],
  alerts: [],
  riskEvents: [],
  driftAlerts: [],
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setDriftAlerts: (alerts) => set({ driftAlerts: alerts }),
  addDriftAlert: (payload) => set((state) => {
    const rawItems = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.alerts)
      ? payload.alerts
      : Array.isArray(payload?.data)
      ? payload.data
      : payload ? [payload] : [];

    if (rawItems.length === 0) return state;

    const newDrifts: DriftAlert[] = rawItems.map((item: any, idx: number) => {
      const id = item.id || `live-drift-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      const agentName = item.agentName || item.agentId || item.agent || 'Monitored Agent';
      const driftType = item.driftType || item.type || 'Concept Drift';

      const divergenceStr = item.divergencePct !== undefined
        ? `${item.divergencePct > 0 ? '+' : ''}${item.divergencePct}%`
        : (item.currentValue !== undefined && item.baselineValue !== undefined
            ? `+${Math.max(1, Math.round(((item.currentValue - item.baselineValue) / Math.max(item.baselineValue, 1)) * 100))}%`
            : '+10.0%');

      const isHighSeverity =
        String(item.severity || '').toUpperCase() === 'CRITICAL' ||
        String(item.severity || '').toUpperCase() === 'HIGH';

      return {
        id,
        name: `${agentName} - ${driftType}`,
        type: driftType,
        shift: `${divergenceStr} ${item.metricName || item.message || 'Divergence'}`,
        status: isHighSeverity ? 'danger' : 'warning',
        severity: isHighSeverity ? 'HIGH' : 'MEDIUM',
        agentName,
        agentId: item.agentId || item.agent,
        message: item.message || item.description,
        time: formatTime(item.timestamp || item.detectedAt || new Date().toISOString()),
        detectedAt: item.timestamp || item.detectedAt || new Date().toISOString()
      };
    });

    const existingIds = new Set(state.driftAlerts.map(d => d.id));
    const filteredNew = newDrifts.filter(d => !existingIds.has(d.id));
    if (filteredNew.length === 0) return state;

    const newAlerts = filteredNew.map(d => ({
      id: d.id,
      title: `Drift Detected: ${d.name}`,
      system: d.agentName || 'AI Agent',
      severity: (d.status === 'danger' ? 'critical' : 'high') as 'critical' | 'high' | 'medium',
      time: d.time || 'Just now',
    }));

    return {
      driftAlerts: [...filteredNew, ...state.driftAlerts].slice(0, 50),
      alerts: [...newAlerts, ...state.alerts].slice(0, 20),
    };
  }),
  
  addEvent: (payload) => set((state) => {
    // Rely exclusively on backend-generated stable ID
    const id = payload.id;
    if (!id) return state; // Ignore invalid payloads without IDs
    
    // Check if we already have this event to prevent duplicates
    if (state.activities.some(a => a.id === id)) return state;

    const time = formatTime(payload.timestamp);
    const agent = payload.metadata?.agent || 'System';
    const actionTarget = payload.metadata?.action || 'evaluated action';
    const decision = payload.decision;
    const policy = payload.reason || 'None';
    const aiSummary = typeof payload.ai_summary === 'string' ? payload.ai_summary : undefined;
    
    // 1. Create Activity Feed Item
    const newActivity: Activity = {
      id,
      user: agent,
      action: decision === 'BLOCK' ? 'blocked action' : 'evaluated',
      target: actionTarget.length > 30 ? actionTarget.substring(0, 30) + '...' : actionTarget,
      time,
      color: decision === 'BLOCK' ? 'var(--risk-critical)' : 'var(--royal-indigo)',
      aiSummary,
      decision,
    };

    // 2. Create Risk Event for RiskCenter Table
    const severityMap: Record<string, 'Critical' | 'High' | 'Medium' | 'Low'> = {
      'BLOCK': 'Critical',
      'MODIFY': 'Medium',
      'ALLOW': 'Low'
    };
    
    const newRiskEvent: RiskEvent = {
      id,
      agent,
      action: actionTarget,
      severity: payload.risk ? (payload.risk as any) : severityMap[decision] || 'Low',
      time,
      status: decision === 'BLOCK' ? 'Blocked' : decision === 'MODIFY' ? 'Flagged' : 'Allowed',
      aiSummary,
      reason: payload.reason || 'None',
      frameworks: payload.compliance || [],
      decision
    };


    // 3. Create Alert if it's a BLOCK
    let newAlerts = [...state.alerts];
    if (decision === 'BLOCK') {
      const newAlert: Alert = {
        id,
        title: `Policy Triggered: ${policy}`,
        system: agent,
        severity: 'critical',
        time,
      };
      newAlerts = [newAlert, ...state.alerts].slice(0, 20); // Keep last 20 alerts
    }

    // Keep arrays bounded (e.g. last 50 events max)
    const newActivities = [newActivity, ...state.activities].slice(0, 50);
    const newRiskEvents = [newRiskEvent, ...state.riskEvents].slice(0, 50);

    return {
      activities: newActivities,
      alerts: newAlerts,
      riskEvents: newRiskEvents,
    };
  }),
}));

if (typeof window !== 'undefined') {
  (window as any).__useSocketStore = useSocketStore;
}
