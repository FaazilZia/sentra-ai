import { useState, useEffect } from 'react';
import { fetchDashboardStats } from '@/lib/api';

export interface KPIData {
  riskScore: { value: number; trend: number; trendLabel: string };
  criticalViolations: { value: number; trend: number; trendLabel: string };
  modelsBlockedToday: { value: number; trend: number; trendLabel: string };
  complianceScore: { value: number; trend: number; trendLabel: string };
}

export interface PromptChartData {
  day: string;
  total: number;
  highRisk: number;
}

export interface DepartmentData {
  name: string;
  low: number;
  medium: number;
  high: number;
}

export type ActionType = 'BLOCK' | 'REQUIRE REVIEW' | 'ALLOW WITH WARNING';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';

export interface ViolationData {
  id: string;
  user: { name: string; role: string; avatar: string };
  prompt: string;
  type: string;
  model: string;
  timestamp: string;
  severity: SeverityType;
  action: ActionType;
  whyBlocked: string;
  regulatoryReference: string;
}

export interface AlertData {
  id: string;
  message: string;
  type: 'warning' | 'critical' | 'info';
  timestamp: string;
}

export interface DashboardData {
  kpis: KPIData;
  chartData: PromptChartData[];
  departments: DepartmentData[];
  violations: ViolationData[];
  alerts: AlertData[];
  insights: string[];
}

export function useDashboardData() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data = await fetchDashboardStats();
      setState(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data: state, loading, error, refresh: fetchData };
}
