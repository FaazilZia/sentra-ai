export type SeverityState = 'Warning' | 'Needs Attention' | 'High Risk' | 'Breach Risk';

export interface EscalationState {
  severity: SeverityState;
  label: string;
  color: string;
  nextEscalationIn?: string;
}

export class EscalationEngine {
  static getEscalation(startTime: number, frequency: number, sensitivity: 'low' | 'medium' | 'high'): EscalationState {
    const elapsedHrs = (Date.now() - startTime) / (1000 * 60 * 60);
    
    // Severity progression logic
    if (elapsedHrs > 24 || sensitivity === 'high' && elapsedHrs > 4) {
      return { severity: 'Breach Risk', label: 'Potential Breach Risk', color: 'text-rose-600' };
    }
    if (elapsedHrs > 12 || frequency > 5) {
      return { severity: 'High Risk', label: 'High Risk Escalation', color: 'text-rose-500' };
    }
    if (elapsedHrs > 4 || frequency > 2) {
      return { severity: 'Needs Attention', label: 'Urgent Processing Required', color: 'text-orange-500' };
    }
    
    return { severity: 'Warning', label: 'Active Warning', color: 'text-amber-500', nextEscalationIn: '4h' };
  }
}
