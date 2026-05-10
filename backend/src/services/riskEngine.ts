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
  // Removed 'send_email' and 'external_api' — too broad, legitimate actions in most contexts.
  // The multi-signal check (intent + sensitive data) already blocks dangerous combinations.
  'export_csv', 'delete_record', 'external_share', 'bypass_auth',
  'export_data', 'master_key', 'admin_access', 'pii_export', 'security_bypass', 'jailbreak', 'unfiltered',
  'delete_all', 'drop_table', 'truncate_table'
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
  /extract/i,
  // Destructive SQL operations
  /drop\s+table/i,
  /truncate\s+table/i,
  /delete\s+from.*where\s+1\s*=\s*1/i,
  /delete\s+all\s+(users?|records?|data)/i,
];

export interface RiskEvaluation {
  score: 'low' | 'medium' | 'high';
  triggers: string[];
}

export const evaluateRisk = (action: string, metadata: any = {}): RiskEvaluation => {
  let score: 'low' | 'medium' | 'high' = 'low';
  const triggers: string[] = [];
  const rawPrompt = String(metadata.prompt || '');
  const combinedText = `${action} ${rawPrompt}`.trim();
  
  // 1. Normalization Layer
  let normalized = combinedText.toLowerCase()
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Handle "s p a c e d" attacks
  const deSpaced = normalized.replace(/\s/g, '');
  
  // Handle Leetspeak (Basic Mapping)
  const leetMap: Record<string, string> = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't' };
  const deLeeted = normalized.split('').map(char => leetMap[char] || char).join('');

  const analysisTargets = [normalized, deSpaced, deLeeted];

  // 2. Base64 Evasion Detection
  if (/[a-zA-Z0-9+/]{20,}={0,2}/.test(rawPrompt)) {
    try {
      const potentialB64 = rawPrompt.match(/[a-zA-Z0-9+/]{20,}={0,2}/)?.[0];
      if (potentialB64) {
        const decoded = Buffer.from(potentialB64, 'base64').toString('utf-8');
        if (/[a-zA-Z]{3,}/.test(decoded)) {
          analysisTargets.push(decoded.toLowerCase());
          triggers.push('Evasion attempt detected: Base64 payload decoded');
        }
      }
    } catch (e) {}
  }

  // 3. Multi-Signal Detection (Intent + Pattern)
  const hasIntent = (target: string) => 
    /export|download|reveal|show|give|leak|extract|bypass|override|ignore/i.test(target);
  
  const hasSensitiveData = (target: string) => 
    Object.values(SENSITIVE_PATTERNS).some(p => p.test(target)) || 
    /password|secret|key|aws|master|credential|medical|ssn/i.test(target);

  for (const target of analysisTargets) {
    // Jailbreak Detection
    const jailbreakMatch = JAILBREAK_PATTERNS.find(pattern => pattern.test(target));
    if (jailbreakMatch) {
      score = 'high';
      triggers.push(`Jailbreak attempt: ${jailbreakMatch.source}`);
    }

    // High Risk Actions
    if (HIGH_RISK_ACTIONS.some(a => target.includes(a.toLowerCase()))) {
      score = 'high';
      triggers.push('High-risk action signature');
    }

    // Multi-signal: Intent + Data
    if (hasIntent(target) && hasSensitiveData(target)) {
      score = 'high';
      triggers.push('Risk Escalation: Intent to exfiltrate sensitive data detected');
    }
  }

  // Fallback to medium if keywords found but no high-risk intent
  if (score === 'low' && analysisTargets.some(t => hasSensitiveData(t))) {
    score = 'medium';
    triggers.push('Sensitive keywords detected');
  }

  return { score, triggers };
};
