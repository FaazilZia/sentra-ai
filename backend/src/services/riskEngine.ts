import logger from '../utils/logger';

export const SENSITIVE_PATTERNS = {
  CREDIT_CARD: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{1,4}\b/,
  EMAIL: /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}\.[A-Za-z]{2,10}\b/,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  JWT: /\beyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
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

const SHELL_INJECTION_PATTERNS = [
  /&&/, /\|\|/, /;/, /\|/, /\$\(/, /`/,
  /bash\s+-c/i, /sh\s+-c/i, /cmd\.exe/i, /powershell/i,
  /rm\s+-rf/i, /curl\s+[^|]{1,200}\|/i, /wget\s+[^|]{1,200}\|/i, /nc\s+-e/i,
  /chmod\s+777/i, /\bsudo\b/i
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//, /\.\.\\/, /\/etc\/passwd/i, /\/proc\/self/i,
  /~\/\.ssh/i, /\.env/, /id_rsa/i,
  /config\s+secrets/i, /credentials\s+dump/i
];

const ENCODED_PAYLOAD_PATTERNS = [
  /%2e%2e%2f/i, // encoded ../
  /eval\(/i, /atob\(/i, /fromCharCode/i,
  /(?:\\x[0-9a-f]{2}){3,}/i // Hex encoded patterns like \x2e\x2e\x2f
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
  const normalized = combinedText.toLowerCase()
    .replaceAll(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Handle "s p a c e d" attacks
  const deSpaced = normalized.replaceAll(/\s/g, '');
  
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
    } catch (error) {
      logger.error('Failed to parse potential base64 payload', { error });
    }
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

    // OS Command Injection Detection
    const shellMatch = SHELL_INJECTION_PATTERNS.find(pattern => pattern.test(target));
    if (shellMatch) {
      score = 'high';
      triggers.push(`OS Command Injection attempt: ${shellMatch.source}`);
    }

    // Path Traversal Detection
    const traversalMatch = PATH_TRAVERSAL_PATTERNS.find(pattern => pattern.test(target));
    if (traversalMatch) {
      score = 'high';
      triggers.push(`Path Traversal attempt: ${traversalMatch.source}`);
    }

    // Encoded Payload Detection
    const encodedMatch = ENCODED_PAYLOAD_PATTERNS.find(pattern => pattern.test(target));
    if (encodedMatch) {
      score = 'high';
      triggers.push(`Obfuscated/Encoded payload attempt: ${encodedMatch.source}`);
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
