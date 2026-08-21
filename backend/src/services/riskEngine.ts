import logger from '../utils/logger';

export const SENSITIVE_PATTERNS = {
  CREDIT_CARD: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{1,4}\b/,
  EMAIL: /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}\.[A-Za-z]{2,10}\b/,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  JWT: /\beyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
};

const SENSITIVE_KEYWORDS_PATTERNS = [
  /\bpassword\b/i, /\baccount\b/i, /\bpersonal\b/i, /\bcredential\b/i, /\bsecret\b/i, /\bconfidential\b/i, /\bpii\b/i, /\bssn\b/i, /\bcredit_card\b/i, /\bapi_key\b/i, /\btoken\b/i,
  /\bmedical\b/i, /\bfinancial\b/i, /\baudit\b/i, /\bpayment\b/i, /\brevenue\b/i, /\bprivate\b/i, /\bmessage\b/i, /\bemail\b/i, /\bphone\b/i, /\baddress\b/i,
  /\bproxy\b/i, /\bscrape\b/i, /\bmanipulate\b/i, /\belderly\b/i, /\btargeting\b/i, /\baws\b/i, /\bkey\b/i, /\bmaster\b/i
];

const HIGH_RISK_ACTIONS = [
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
  /delete\s+from[^;]{0,200}where\s+1\s*=\s*1/i,
  /delete\s+all\s+(users?|records?|data)/i,
];

const SHELL_INJECTION_PATTERNS = [
  /&&\s*(?:rm|cat|ls|cd|exec|sudo|curl|wget|chmod|chown|kill|python|node|bash|sh|powershell|cmd)\b/i,
  /\|\|\s*(?:rm|cat|ls|cd|exec|sudo|curl|wget|chmod|chown|kill|python|node|bash|sh|powershell|cmd)\b/i,
  /;\s*(?:rm|cat|ls|cd|exec|sudo|curl|wget|chmod|chown|kill|python|node|bash|sh|powershell|cmd)\b/i,
  /(?<!\|)\|\s*(?!\|)(?:[a-zA-Z_$(`])/, /\$\(/, /`/,
  /bash\s+-c/i, /sh\s+-c/i, /cmd\.exe/i, /powershell/i,
  /rm\s+-rf/i, /curl\s+[^|]{1,200}\|/i, /wget\s+[^|]{1,200}\|/i, /nc\s+-e/i,
  /chmod\s+777/i, /\bsudo\b/i
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//, /\.\.\\/, /\/etc\/passwd/i, /\/proc\/self/i,
  /~\/\.ssh/i, /\/\.env\b/i, /\.env\.(?:local|development|production|staging|test)\b/i, /id_rsa/i,
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
  risk_score?: number;
}

export const evaluateRisk = (action: string, metadata: any = {}): RiskEvaluation => {
  let score: 'low' | 'medium' | 'high' = 'low';
  const triggers: string[] = [];
  const rawPrompt = String(metadata.prompt || '');
  const combinedText = `${action} ${rawPrompt}`.trim();

  let actionObj: any = null;
  try {
    if (action.trim().startsWith('{') || action.trim().startsWith('[')) {
      actionObj = JSON.parse(action);
    }
  } catch (e) {
    // Ignore
  }

  let riskScoreNum = 15; // Base risk score
  let isSelfModification = false;
  let isBypassApproval = false;

  if (actionObj) {
    const params = actionObj.parameters || {};
    const targetUserId = params.target_user_id;
    const agentId = metadata.agent_id || metadata.agent || actionObj.agent_id;
    if (targetUserId && agentId && targetUserId === agentId) {
      isSelfModification = true;
    }
    if (params.bypass_approval_workflow === true) {
      isBypassApproval = true;
    }
  } else {
    // Fallback checks on serialized string representation
    if (action.includes('bypass_approval_workflow') || action.includes('bypass_approval')) {
      isBypassApproval = true;
    }
    if (action.includes('target_user_id') && (action.includes('helpdesk-bot-v2') || action.includes('self'))) {
      isSelfModification = true;
    }
  }

  if (isSelfModification) {
    riskScoreNum += 50;
    triggers.push('Self-role modification attempt detected');
  }
  if (isBypassApproval) {
    riskScoreNum += 30;
    triggers.push('Bypass approval workflow requested');
  }

  if (riskScoreNum > 75) {
    score = 'high';
  }
  
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
    /\b(?:password|secret|key|aws|master|credential|medical|ssn)\b/i.test(target);

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

    // Governance Compliance Heuristics
    // 1. Consent withdrawal violation check
    if (/consent.*(?:withdrawn|revoked|withdrew)/i.test(target)) {
      score = 'high';
      triggers.push('Governance: Processing data after consent withdrawal is blocked');
    }

    // 2. Training model without consent check
    if (/train.*without.*consent/i.test(target)) {
      score = 'high';
      triggers.push('Governance: Training models without consent is blocked');
    }

    // 3. Sharing patient PHI/SSN on Slack/chat check
    if (/(?:slack|teams|discord|channel|chat).*(?:ssn|patient|diagnosis|medical|treatment)/i.test(target) ||
        /(?:ssn|patient|diagnosis|medical|treatment).*(?:slack|teams|discord|channel|chat)/i.test(target)) {
      score = 'high';
      triggers.push('Governance: Sharing patient PHI/SSN on chat channels is blocked');
    }
  }

  // Fallback to medium if keywords found but no high-risk intent
  if (score === 'low' && analysisTargets.some(t => hasSensitiveData(t))) {
    score = 'medium';
    triggers.push('Sensitive keywords detected');
  }

  if (score === 'high') {
    riskScoreNum = Math.max(riskScoreNum, 90);
  } else if (score === 'medium') {
    riskScoreNum = Math.max(riskScoreNum, 65);
  }

  return { score, triggers, risk_score: riskScoreNum };
};
