const SENSITIVE_KEYWORDS = [
  'password', 'account', 'personal', 'credential', 'secret', 'confidential', 'pii', 'ssn', 'credit_card'
];

const HIGH_RISK_ACTIONS = [
  'send_email', 'external_api', 'export_csv', 'delete_record', 'update_config', 'external_share'
];

const MEDIUM_RISK_ACTIONS = [
  'read_database', 'read_pii', 'access_logs'
];

export interface RiskEvaluation {
  score: 'low' | 'medium' | 'high';
  triggers: string[];
}

export const evaluateRisk = (action: string, metadata: any = {}): RiskEvaluation => {
  let score: 'low' | 'medium' | 'high' = 'low';
  const triggers: string[] = [];
  const lowercaseAction = action.toLowerCase();
  const dataString = JSON.stringify(metadata).toLowerCase();

  if (HIGH_RISK_ACTIONS.includes(lowercaseAction)) {
    score = 'high';
    triggers.push(`High-risk action: ${action}`);
  } else if (MEDIUM_RISK_ACTIONS.includes(lowercaseAction)) {
    score = 'medium';
    triggers.push(`Medium-risk action: ${action}`);
  }

  const foundKeywords = SENSITIVE_KEYWORDS.filter(kw => dataString.includes(kw));
  if (foundKeywords.length > 0) {
    score = 'high';
    triggers.push(`Sensitive data detected: ${foundKeywords.join(', ')}`);
  }

  return { score, triggers };
};
