export type EngineVerdict = 'pass' | 'fail' | 'anomaly' | 'suspicious';

export interface EngineResults {
  policy_engine: EngineVerdict;
  behavior_engine: EngineVerdict;
  anomaly_engine: EngineVerdict;
}

export class MultiEngineEvaluator {
  static evaluateConflict(results: EngineResults): { hasConflict: boolean; severity: 'low' | 'medium' | 'high' } {
    const verdicts = Object.values(results);
    const uniqueVerdicts = new Set(verdicts);
    
    if (uniqueVerdicts.size > 1) {
      const hasFail = uniqueVerdicts.has('fail');
      const hasAnomaly = uniqueVerdicts.has('anomaly') || uniqueVerdicts.has('suspicious');
      
      return {
        hasConflict: true,
        severity: hasFail && hasAnomaly ? 'high' : hasFail ? 'medium' : 'low'
      };
    }
    
    return { hasConflict: false, severity: 'low' };
  }
}
