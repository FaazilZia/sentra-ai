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
  /delete\s+from[^;]{0,200}where\s+1\s*=\s*1/i,
  /delete\s+all\s+(users?|records?|data)/i,
];

const SHELL_INJECTION_PATTERNS = [
  /&&/, /\|\|/, /;/, /\|\s*(?:[a-zA-Z_\$\(`])/, /\$\(/, /`/,
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

    // Governance Compliance Heuristics (L2 pattern-matching fallback when L3 is degraded)
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

    // 4. GDPR cross-border transfer without SCC
    if (/(?:gdpr|german|eu\b|european|cross[-_ ]?border)/i.test(target) &&
        /(?:transfer|export|send|transmit|share|sync)/i.test(target) &&
        (/(?:without|no|missing|lacks?)[_ ]+(?:an?[_ ]+|signed[_ ]+)?(?:sccs?|adequacy|standard[_ ]+contractual[_ ]+clauses)/i.test(target) || metadata?.has_scc === false) &&
        metadata?.has_scc !== true) {
      score = 'high';
      triggers.push('Governance (GDPR): Cross-border transfer without SCC safeguards is blocked');
    }

    // 5. HIPAA PHI/data share without BAA
    if (/(?:hipaa|phi\b|patient|clinical|medical|diagnosis|health)/i.test(target) &&
        /(?:share|disclose|send|export|transfer|transmit)/i.test(target) &&
        (/(?:without|no|missing|lacks?)[_ ]+(?:an?[_ ]+|signed[_ ]+)?(?:baa|business[_ ]+associate[_ ]+agreement)/i.test(target) || metadata?.has_baa === false) &&
        metadata?.has_baa !== true) {
      score = 'high';
      triggers.push('Governance (HIPAA): PHI/data disclosure without signed BAA is blocked');
    }

    // 6. DPDP minor biometric data without consent
    const rawPrincipalAge = metadata?.dataPrincipalAge ?? metadata?.subject_age ?? metadata?.age;
    const isAdult = rawPrincipalAge !== undefined && rawPrincipalAge !== null && Number(rawPrincipalAge) >= 18;
    if (!isAdult &&
        /(?:minor|child|children|under[_ ]*18|age[_ ]*1[0-7])/i.test(target) &&
        /(?:biometric|facial|face[_ ]?scan|fingerprint|iris|retina|voiceprint)/i.test(target) &&
        (/(?:without|no|missing|lacks?|unverified)[_ ]+(?:verifiable[_ ]+|verified[_ ]+)?(?:parental[_ ]+)?consent/i.test(target) || metadata?.verifiedParentalConsent === false) &&
        metadata?.verifiedParentalConsent !== true) {
      score = 'high';
      triggers.push('Governance (DPDP): Minor biometric data processing without verified parental consent is blocked');
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
