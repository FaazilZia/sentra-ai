import { useState, useEffect } from 'react';

// --- Types ---
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

export interface SimulationState {
  kpis: KPIData;
  chartData: PromptChartData[];
  departments: DepartmentData[];
  violations: ViolationData[];
  alerts: AlertData[];
  insights: string[];
}

// --- Mock Data Generators ---
const USERS = [
  { name: 'Alex Chen', role: 'Senior Engineer', avatar: 'AC' },
  { name: 'Sarah Miller', role: 'Sales Rep', avatar: 'SM' },
  { name: 'David Park', role: 'Marketing Lead', avatar: 'DP' },
  { name: 'Emily Davis', role: 'HR Manager', avatar: 'ED' },
  { name: 'Michael Chang', role: 'Data Scientist', avatar: 'MC' },
  { name: 'Jessica Wong', role: 'Product Manager', avatar: 'JW' },
];

const MODELS = ['GPT-4', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro', 'Custom Internal Model', 'GPT-4o'];

const PROMPTS = [
  { text: 'Write a script to bypass the new authentication portal...', type: 'Jailbreak', action: 'BLOCK' as ActionType, severity: 'critical' as SeverityType, whyBlocked: 'Attempted credential extraction', regulatoryReference: 'SOC2 CC6' },
  { text: 'Can you summarize these customer medical records: [ATTACHED]...', type: 'PHI Leak', action: 'BLOCK' as ActionType, severity: 'critical' as SeverityType, whyBlocked: 'Sent PHI to external model', regulatoryReference: 'HIPAA §164' },
  { text: 'Generate API keys for the production database to test this...', type: 'Secret Exposure', action: 'BLOCK' as ActionType, severity: 'high' as SeverityType, whyBlocked: 'Exposed access credentials', regulatoryReference: 'ISO 27001' },
  { text: 'Review the performance feedback containing salaries for...', type: 'PII', action: 'REQUIRE REVIEW' as ActionType, severity: 'medium' as SeverityType, whyBlocked: 'Contains unredacted PII', regulatoryReference: 'Internal Policy' },
  { text: 'How do I access the root directory of the internal VPN?', type: 'Jailbreak', action: 'BLOCK' as ActionType, severity: 'high' as SeverityType, whyBlocked: 'Unauthorized network enumeration', regulatoryReference: 'NIST CSF' },
  { text: 'Summarize Q3 financial projections before the public release...', type: 'Sensitive Document Access', action: 'REQUIRE REVIEW' as ActionType, severity: 'high' as SeverityType, whyBlocked: 'Material Non-Public Info', regulatoryReference: 'SEC Reg FD' },
  { text: 'Draft an email to the client explaining the security breach...', type: 'Data Leakage', action: 'REQUIRE REVIEW' as ActionType, severity: 'high' as SeverityType, whyBlocked: 'Unapproved breach disclosure', regulatoryReference: 'GDPR Art. 33' },
  { text: 'Translate this confidential M&A contract into Spanish...', type: 'Sensitive Document Access', action: 'ALLOW WITH WARNING' as ActionType, severity: 'medium' as SeverityType, whyBlocked: 'Processing highly confidential IP', regulatoryReference: 'NDA' },
  { text: 'Create a list of email addresses from this unredacted CSV...', type: 'PII', action: 'BLOCK' as ActionType, severity: 'high' as SeverityType, whyBlocked: 'Unauthorized data exposure', regulatoryReference: 'GDPR Art. 5' },
];

const generateId = () => `V-${Math.floor(Math.random() * 10000)}`;

function generateRandomViolation(): ViolationData {
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const model = MODELS[Math.floor(Math.random() * MODELS.length)];
  const promptTemplate = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  
  return {
    id: generateId(),
    user,
    prompt: promptTemplate.text,
    type: promptTemplate.type,
    model,
    timestamp: 'Just now',
    severity: promptTemplate.severity,
    action: promptTemplate.action,
    whyBlocked: promptTemplate.whyBlocked,
    regulatoryReference: promptTemplate.regulatoryReference
  };
}

const initialChartData: PromptChartData[] = [
  { day: 'Mon', total: 4200, highRisk: 120 },
  { day: 'Tue', total: 3800, highRisk: 150 },
  { day: 'Wed', total: 5100, highRisk: 280 }, // Mid-week peak
  { day: 'Thu', total: 4700, highRisk: 210 },
  { day: 'Fri', total: 4900, highRisk: 340 }, // Spike
  { day: 'Sat', total: 2100, highRisk: 80 },
  { day: 'Sun', total: 1800, highRisk: 60 },
];

export function useDashboardSimulation() {
  const [state, setState] = useState<SimulationState>({
    kpis: {
      riskScore: { value: 72, trend: 4, trendLabel: 'points vs last week' },
      criticalViolations: { value: 14, trend: 2, trendLabel: 'since yesterday' },
      modelsBlockedToday: { value: 3, trend: 1, trendLabel: 'vs yesterday' },
      complianceScore: { value: 84, trend: -1, trendLabel: 'vs last month' },
    },
    chartData: initialChartData,
    departments: [
      { name: 'Engineering', low: 450, medium: 120, high: 45 },
      { name: 'Sales', low: 320, medium: 85, high: 12 },
      { name: 'Marketing', low: 210, medium: 40, high: 8 },
      { name: 'HR', low: 95, medium: 10, high: 2 },
    ],
    violations: Array.from({ length: 8 }).map((_, i) => ({
      ...generateRandomViolation(),
      timestamp: `${i * 2 + 1} mins ago`
    })),
    alerts: [],
    insights: [
      "🚨 High-risk prompts increased by 32% in last 24h",
      "🔓 Jailbreak attempts detected on Custom Internal Model",
      "📊 Engineering responsible for 68% of violations"
    ]
  });

  // Simulation Tick
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const hasNewViolation = Math.random() > 0.8;
        let newViolations = [...prev.violations];
        let newAlerts = [...prev.alerts];
        let newRiskScore = prev.kpis.riskScore.value;
        let newCriticalViolations = prev.kpis.criticalViolations.value;
        let newModelsBlocked = prev.kpis.modelsBlockedToday.value;

        if (hasNewViolation) {
          const violation = generateRandomViolation();
          newViolations.unshift(violation);
          if (newViolations.length > 15) newViolations.pop();
          
          if (violation.severity === 'critical') {
            newCriticalViolations += 1;
            newRiskScore = Math.min(100, newRiskScore + 1); // Increase risk score
            if (violation.action === 'BLOCK') {
              newModelsBlocked += 1;
            }
            
            // Add an alert
            newAlerts.unshift({
              id: generateId(),
              message: `🚨 ${violation.type} detected from ${violation.user.name} (${violation.user.role})`,
              type: 'critical',
              timestamp: 'Just now'
            });
            if (newAlerts.length > 3) newAlerts.pop();
          }
        }

        // Clean up old alerts occasionally
        if (Math.random() > 0.9 && newAlerts.length > 0) {
          newAlerts.pop();
        }

        // 2. Wiggle today's chart data slightly
        const newChartData = [...prev.chartData];
        const todayIdx = 6; // Sunday
        newChartData[todayIdx] = {
          ...newChartData[todayIdx],
          total: newChartData[todayIdx].total + Math.floor(Math.random() * 5),
          highRisk: newChartData[todayIdx].highRisk + (hasNewViolation ? 1 : 0)
        };

        return {
          ...prev,
          kpis: {
            ...prev.kpis,
            riskScore: { ...prev.kpis.riskScore, value: newRiskScore },
            criticalViolations: { ...prev.kpis.criticalViolations, value: newCriticalViolations },
            modelsBlockedToday: { ...prev.kpis.modelsBlockedToday, value: newModelsBlocked }
          },
          violations: newViolations,
          chartData: newChartData,
          alerts: newAlerts
        };
      });
    }, 3000); // Tick every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Update timestamps every minute
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setState(prev => ({
        ...prev,
        violations: prev.violations.map(v => {
          if (v.timestamp === 'Just now') return { ...v, timestamp: '1 min ago' };
          const match = v.timestamp.match(/(\d+) mins ago/);
          if (match) {
            return { ...v, timestamp: `${parseInt(match[1]) + 1} mins ago` };
          }
          return v;
        })
      }));
    }, 60000);
    return () => clearInterval(timeInterval);
  }, []);

  return state;
}
