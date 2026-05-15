import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  color: string;
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
}

interface SocketState {
  connectionStatus: ConnectionStatus;
  activities: Activity[];
  alerts: Alert[];
  riskEvents: RiskEvent[];
  setConnectionStatus: (status: ConnectionStatus) => void;
  addEvent: (payload: any) => void;
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
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
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
    
    // 1. Create Activity Feed Item
    const newActivity: Activity = {
      id,
      user: agent,
      action: decision === 'BLOCK' ? 'blocked action' : 'evaluated',
      target: actionTarget.length > 30 ? actionTarget.substring(0, 30) + '...' : actionTarget,
      time,
      color: decision === 'BLOCK' ? 'var(--risk-critical)' : 'var(--royal-indigo)',
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
