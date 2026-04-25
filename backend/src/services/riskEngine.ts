export const SENSITIVE_PATTERNS = {
  CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  JWT: /\beyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/
};

const SENSITIVE_KEYWORDS = [
  'password', 'account', 'personal', 'credential', 'secret', 'confidential', 'pii', 'ssn', 'credit_card', 'api_key', 'token',
  'medical', 'financial', 'audit', 'payment', 'revenue', 'private', 'message', 'email', 'phone', 'address',
  'proxy', 'scrape', 'manipulate', 'elderly', 'targeting'
];

const HIGH_RISK_ACTIONS = [
  'send_email', 'external_api', 'export_csv', 'delete_record', 'update_config', 'external_share', 'bypass_auth',
  'export_data', 'master_key', 'admin_access', 'pii_export', 'security_bypass', 'jailbreak', 'unfiltered'
];

const MEDIUM_RISK_ACTIONS = [
  'read_database', 'read_pii', 'access_logs', 'modify_record'
];

export interface RiskEvaluation {
  score: 'low' | 'medium' | 'high';
  triggers: string[];
}

const JAILBREAK_PATTERNS = [
  /ignore all previous instructions/i,
  /system prompt/i,
  /dan mode/i,
  /unfiltered/i,
  /bypass/i,
  /grandmother/i,
  /masterkey/i,
  /debug mode/i,
  /override/i,
  /roleplay/i,
  /pretend you are/i
];

export const evaluateRisk = (action: string, metadata: any = {}): RiskEvaluation => {
  let score: 'low' | 'medium' | 'high' = 'low';
  const triggers: string[] = [];
  const lowercaseAction = action.toLowerCase();
  const dataString = (action + ' ' + JSON.stringify(metadata)).toLowerCase();
  const prompt = (action + ' ' + String(metadata.prompt || '')).toLowerCase();

  // 1. Action Risk
  const matchedHighRisk = HIGH_RISK_ACTIONS.find(a => prompt.includes(a.toLowerCase()));
  if (matchedHighRisk) {
    score = 'high';
    triggers.push(`High-risk signature detected: ${matchedHighRisk}`);
  } else {
    const matchedMediumRisk = MEDIUM_RISK_ACTIONS.find(a => prompt.includes(a.toLowerCase()));
    if (matchedMediumRisk) {
      score = 'medium';
      triggers.push(`Medium-risk signature detected: ${matchedMediumRisk}`);
    }
  }

  // 2. Keyword Analysis
  const foundKeywords = SENSITIVE_KEYWORDS.filter(kw => dataString.includes(kw));
  if (foundKeywords.length > 0) {
    if (score !== 'high') score = 'medium';
    triggers.push(`Sensitive keywords detected: ${foundKeywords.join(', ')}`);
    
    // Escalation: Multiple sensitive keywords + intent
    const hasExportIntent = prompt.includes('export') || prompt.includes('download') || prompt.includes('show me') || prompt.includes('give me');
    const hasSensitiveData = foundKeywords.some(kw => ['email', 'phone', 'ssn', 'medical', 'financial', 'pii', 'secret', 'key'].includes(kw));
    
    if (hasExportIntent && hasSensitiveData) {
      score = 'high';
      triggers.push('Risk Escalation: Probable data exfiltration attempt detected');
    }

    if (foundKeywords.length >= 3) {
      score = 'high';
      triggers.push('Risk Escalation: High density of sensitive identifiers detected');
    }
  }

  // 3. Pattern Matching (PII Detection)
  for (const [name, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    if (pattern.test(dataString)) {
      score = 'high';
      triggers.push(`Sensitive pattern detected: ${name}`);
    }
  }

  // 4. Jailbreak Detection
  const jailbreakMatch = JAILBREAK_PATTERNS.find(pattern => pattern.test(prompt));
  if (jailbreakMatch) {
    score = 'high';
    triggers.push(`Potential jailbreak attempt detected: ${jailbreakMatch.source}`);
  }

  // 5. Contextual Risk (e.g. bulk export)
  if (lowercaseAction === 'export_csv' && metadata.recordCount > 1000) {
    score = 'high';
    triggers.push('Bulk data export detected (>1000 records)');
  }

  return { score, triggers };
};


