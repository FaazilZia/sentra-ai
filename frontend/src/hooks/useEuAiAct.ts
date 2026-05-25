import { useState, useEffect, useCallback } from 'react';
import { 
  fetchEuAiActOverview, 
  fetchComplianceStats, 
  updateEuAiActImplementation,
  EuAiActOverview,
  ComplianceStats
} from '@/lib/api';

export function useEuAiAct() {
  const [overview, setOverview] = useState<EuAiActOverview | null>(null);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewData, statsData] = await Promise.all([
        fetchEuAiActOverview(),
        fetchComplianceStats()
      ]);
      setOverview(overviewData);
      setStats(statsData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch EU AI Act data:', err);
      setError(err.message || 'Failed to fetch EU AI Act data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateImplementation = useCallback(async (
    controlCode: string, 
    data: {
      status: string;
      notes?: string;
      owner_user_id?: string;
      due_date?: string | null;
    }
  ) => {
    try {
      const res = await updateEuAiActImplementation(controlCode, data);
      
      // Concurrently fetch updated state
      const [overviewData, statsData] = await Promise.all([
        fetchEuAiActOverview(),
        fetchComplianceStats()
      ]);
      setOverview(overviewData);
      setStats(statsData);
      
      return res;
    } catch (err: any) {
      console.error('Failed to update EU AI Act implementation:', err);
      throw err;
    }
  }, []);

  return {
    overview,
    stats,
    isLoading,
    error,
    updateImplementation,
    refresh
  };
}
