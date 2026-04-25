export const SENSITIVE_PATTERNS = {
  CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  JWT: /\beyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/
};

const SENSITIVE_KEYWORDS = [
  'password', 'account', 'personal', 'credential', 'secret', 'confidential', 'pii', 'ssn', 'credit_card', 'api_key', 'token',
  'medical', 'financial', 'audit', 'payment', 'revenue', 'private', 'message', 'email', 'phone', 'address',
  'proxy', 'scrape', 'manipulate', 'elderly', 'targeting', 'aws', 'key', 'master'
];

const HIGH_RISK_ACTIONS = [
  'send_email', 'external_api', 'export_csv', 'delete_record', 'update_config', 'external_share', 'bypass_auth',
  'export_data', 'master_key', 'admin_access', 'pii_export', 'security_bypass', 'jailbreak', 'unfiltered'
];

const MEDIUM_RISK_ACTIONS = [
  'read_database', 'read_pii', 'access_logs', 'modify_record'
];

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
  /pretend you are/i,
  /steal/i,
  /hack/i,
  /leak/i,
  /extract/i
];

export interface RiskEvaluation {
  score: 'low' | 'medium' | 'high';
  triggers: string[];
}

export const evaluateRisk = (action: string, metadata: any = {}): RiskEvaluation => {
  let score: 'low' | 'medium' | 'high' = 'low';
  const triggers: string[] = [];
  const rawPrompt = String(metadata.prompt || metadata.action || action);
  const dataString = (action + ' ' + JSON.stringify(metadata)).toLowerCase();

  // Level 0: Evasion Detection (Base64) - MUST BE CASE SENSITIVE
  let decodedPrompt = rawPrompt.toLowerCase();
  if (/[a-zA-Z0-9+/]{20,}={0,2}/.test(rawPrompt)) {
    try {
      const potentialB64 = rawPrompt.match(/[a-zA-Z0-9+/]{20,}={0,2}/)?.[0];
      if (potentialB64) {
        const decoded = Buffer.from(potentialB64, 'base64').toString('utf-8');
        // Validate it's likely English/text
        if (/[a-zA-Z]{3,}/.test(decoded)) {
          decodedPrompt = (rawPrompt + ' ' + decoded).toLowerCase();
          triggers.push('Evasion attempt detected: Base64 payload decoded and analyzed');
        }
      }
    } catch (e) {}
  }

  // 1. Action Risk (Fuzzy Matching)
  const finalPrompt = decodedPrompt;
  const matchedHighRisk = HIGH_RISK_ACTIONS.find(a => {
    const words = a.toLowerCase().split('_');
    return finalPrompt.includes(a.toLowerCase()) || (words.length > 1 && words.every(w => finalPrompt.includes(w)));
  });
  
  if (matchedHighRisk) {
    score = 'high';
    triggers.push(`High-risk signature detected: ${matchedHighRisk}`);
  }

  // 2. Keyword Analysis
  const foundKeywords = SENSITIVE_KEYWORDS.filter(kw => finalPrompt.includes(kw) || dataString.includes(kw));
  if (foundKeywords.length > 0) {
    if (score !== 'high') score = 'medium';
    triggers.push(`Sensitive keywords detected: ${foundKeywords.join(', ')}`);
    
    const hasExportIntent = finalPrompt.includes('export') || finalPrompt.includes('download') || finalPrompt.includes('show me') || finalPrompt.includes('give me') || finalPrompt.includes('reveal');
    const hasSensitiveData = foundKeywords.some(kw => ['email', 'phone', 'ssn', 'medical', 'financial', 'pii', 'secret', 'key', 'aws', 'master'].includes(kw));
    
    if (hasExportIntent && hasSensitiveData) {
      score = 'high';
      triggers.push('Risk Escalation: Probable data exfiltration attempt detected');
    }
  }

  // 3. Pattern Matching (PII Detection)
  for (const [name, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    if (pattern.test(finalPrompt) || pattern.test(dataString)) {
      score = 'high';
      triggers.push(`Sensitive pattern detected: ${name}`);
    }
  }

  // 4. Jailbreak Detection
  const jailbreakMatch = JAILBREAK_PATTERNS.find(pattern => pattern.test(finalPrompt));
  if (jailbreakMatch) {
    score = 'high';
    triggers.push(`Potential jailbreak attempt detected: ${jailbreakMatch.source}`);
  }

  return { score, triggers };
};
