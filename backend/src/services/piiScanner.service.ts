interface PatternRule {
  regex: RegExp;
  redactedLabel: string;
  frameworks: string[];
  risk: 'medium' | 'high';
}

export interface PIIScanResult {
  piiDetected: boolean;
  redactedText: string;
  detectedCategories: string[];
  violatedFrameworks: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface PIIMatch {
  category: string;
  value: string;
  start: number;
  end: number;
  redactedLabel: string;
  frameworks: string[];
}

export class PIIScannerService {
  private static readonly PATTERNS: Record<string, PatternRule> = {
    EMAIL: {
      regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b|\b[a-zA-Z0-9._%+-]+\s*(?:\[at\]|\(at\))\s*[a-zA-Z0-9.-]+\s*(?:\[dot\]|\(dot\)|\.)\s*[a-zA-Z]{2,}\b/gi,
      redactedLabel: '[EMAIL_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    PHONE: {
      regex: /(?<!\b(?:tracking|order|invoice|timestamp|epoch|build|version)\s*(?:number|id|#)?\s*:?\s*)(?:\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- .]\d{3}[- .]\d{4}\b|(?:\+|\b)\d{1,3}\s*[- .]?\d{10,12}\b|\b(?:\d\.){9}\d\b|(?:\b(?:phone|mobile|cell|contact)(?:[a-z0-9_.\s:]{1,30})\d{10}\b))(?!\s*(?:timestamp|ms|sec|seconds))/gi,
      redactedLabel: '[PHONE_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    SSN: {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      redactedLabel: '[SSN_REDACTED]',
      frameworks: ['HIPAA', 'GDPR'],
      risk: 'high'
    },
    CREDIT_CARD: {
      regex: /\b(?:\d[ -]*?){13,16}\b/g,
      redactedLabel: '[CARD_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'high'
    },
    AADHAAR: {
      regex: /(?<!\b(?:tracking|order|invoice|shipment|serial)\s*(?:number|id|#)?\s*:?\s*)\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,
      redactedLabel: '[AADHAAR_REDACTED]',
      frameworks: ['DPDP'],
      risk: 'high'
    },
    PAN: {
      regex: /\b[A-Z]{5}\d{4}[A-Z]\b/gi,
      redactedLabel: '[PAN_REDACTED]',
      frameworks: ['DPDP'],
      risk: 'medium'
    },
    PASSPORT: {
      regex: /\b(?:[A-Z]\d{7}|\d{9})\b/gi,
      redactedLabel: '[PASSPORT_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'high'
    },
    API_KEY: {
      regex: /\b(?:sk_(?:live|test|prod)_[a-zA-Z0-9]{10,60}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9-]{10,60}|AKIA[0-9A-Z]{16}|(?:key|api|token|secret|password)[a-zA-Z0-9_-]{8,60})\b/gi,
      redactedLabel: '[API_KEY_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA', 'NIST_AI_RMF'],
      risk: 'medium'
    },
    BEARER_TOKEN: {
      regex: /\bBearer\s+[a-zA-Z0-9._~+/-]{15,}\b/gi,
      redactedLabel: '[BEARER_TOKEN_REDACTED]',
      frameworks: ['NIST_AI_RMF', 'GDPR'],
      risk: 'medium'
    },
    KEY_ASSIGNMENT: {
      regex: /\b(?:api_key|secret_key|app_secret|password|access_token|auth_token|credential)\s*[:=]\s*['"]?[a-zA-Z0-9_.-]{8,80}['"]?\b/gi,
      redactedLabel: '[CREDENTIAL_ASSIGNMENT_REDACTED]',
      frameworks: ['NIST_AI_RMF', 'GDPR'],
      risk: 'medium'
    },
    JWT_TOKEN: {
      regex: /\beyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\b/g,
      redactedLabel: '[JWT_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA', 'NIST_AI_RMF'],
      risk: 'medium'
    },
    AWS_KEY: {
      regex: /\bAKIA[0-9A-Z]{16}\b/g,
      redactedLabel: '[AWS_KEY_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA', 'NIST_AI_RMF'],
      risk: 'medium'
    },
    IP_ADDRESS: {
      regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      redactedLabel: '[IP_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    STREET_ADDRESS: {
      regex: /\b\d{1,6}\s{1,3}(?:[-A-Za-z0-9#'.]+\s{1,3}){1,8}(?:Street|St|Avenue|Ave|Road|Rd|Highway|Hwy|Boulevard|Blvd|Court|Ct|Drive|Dr|Lane|Ln|Way|Terrace|Ter)\b/gi,
      redactedLabel: '[ADDRESS_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    DATE_OF_BIRTH: {
      regex: /\b(?:\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\b/g,
      redactedLabel: '[DOB_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    US_DRIVERS_LICENSE: {
      regex: /\b[A-Z]\d{3}[- ]?\d{3}[- ]?\d{3}\b/gi,
      redactedLabel: '[DRIVERS_LICENSE_REDACTED]',
      frameworks: ['HIPAA', 'GDPR'],
      risk: 'medium'
    },
    NAME_IN_CONTEXT: {
      regex: /\b(?:[eE]mployee|[cC]ustomer|[pP]atient|[uU]ser)\s+(?:file\s*(?:for\s*)?|for\s*)?([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})/g,
      redactedLabel: '[NAME_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    HINGLISH_PII_PHRASE: {
      regex: /\b(?:aadhaar|pan|ssn|phone|email)\s*(?:card|number|details)?\s*(?:update|link|verify|submit|par|pe|ko)\b/gi,
      redactedLabel: '[HINGLISH_PII_TRIGGER_REDACTED]',
      frameworks: ['DPDP', 'GDPR'],
      risk: 'medium'
    }
  };

  /**
   * Collapses single-character or single-digit spaced sequences for obfuscated PII normalization.
   */
  private static normalizeSpacedText(text: string): string {
    if (!text) return text;
    let normalized = text;
    // Collapse spaces around parentheses e.g. "(4 1 5)" => "(415)"
    normalized = normalized.replace(/\(\s*/g, '(').replace(/\s*\)/g, ')');
    // Collapse spaces around punctuation e.g. "1 2 3 - 4 5" => "123-45", "(415) - 555" => "(415)-555"
    normalized = normalized.replace(/([a-zA-Z0-9)])\s*([-.:])\s*(?=[a-zA-Z0-9])/g, '$1$2');
    // Collapse single-character or single-digit spaced sequences
    normalized = normalized.replace(/\b([a-zA-Z0-9])\s+(?=[a-zA-Z0-9]\b)/gi, '$1');
    // Collapse multi-char spaced sequences e.g. "A B C D E 1 2 3 4 F" => "ABCDE1234F"
    normalized = normalized.replace(/(?:\b[a-zA-Z0-9]\s+)+[a-zA-Z0-9]\b/gi, (m) => m.replace(/\s+/g, ''));
    return normalized;
  }

  /**
   * Decodes Base64 candidates in text and returns scanned findings from decoded payloads.
   */
  private static scanBase64Payloads(text: string): { categories: string[]; frameworks: string[] } {
    const extraCategories = new Set<string>();
    const extraFrameworks = new Set<string>();

    const b64Regex = /\b[a-zA-Z0-9+/]{16,}={0,2}\b/g;
    let match;
    while ((match = b64Regex.exec(text)) !== null) {
      try {
        const decoded = Buffer.from(match[0], 'base64').toString('utf-8');
        if (/[a-zA-Z0-9]{3,}/.test(decoded) && decoded !== match[0]) {
          const subScan = this.scan(decoded);
          if (subScan.piiDetected) {
            subScan.detectedCategories.forEach(c => extraCategories.add(c));
            subScan.violatedFrameworks.forEach(f => extraFrameworks.add(f));
          }
        }
      } catch (e) {
        // Ignore invalid base64
      }
    }

    return {
      categories: Array.from(extraCategories),
      frameworks: Array.from(extraFrameworks)
    };
  }

  /**
   * Scans a single string for any of the PII categories.
   */
  public static scan(text: string): PIIScanResult {
    if (!text) {
      return {
        piiDetected: false,
        redactedText: '',
        detectedCategories: [],
        violatedFrameworks: [],
        riskLevel: 'low'
      };
    }

    const matches: PIIMatch[] = [];

    // 1. Gather all potential matches across all regexes on primary text
    for (const [category, rule] of Object.entries(this.PATTERNS)) {
      rule.regex.lastIndex = 0; // Reset regex matching position
      let match;
      while ((match = rule.regex.exec(text)) !== null) {
        const val = match[0];
        matches.push({
          category,
          value: val,
          start: match.index,
          end: match.index + val.length,
          redactedLabel: rule.redactedLabel,
          frameworks: rule.frameworks
        });

        if (rule.regex.lastIndex === match.index) {
          rule.regex.lastIndex++;
        }
      }
    }

    // 2. Auxiliary Check A: Spaced character normalization scan
    const normalizedText = this.normalizeSpacedText(text);
    if (normalizedText !== text) {
      for (const [category, rule] of Object.entries(this.PATTERNS)) {
        rule.regex.lastIndex = 0;
        let match;
        while ((match = rule.regex.exec(normalizedText)) !== null) {
          const val = match[0];
          matches.push({
            category,
            value: val,
            start: 0,
            end: text.length,
            redactedLabel: rule.redactedLabel,
            frameworks: rule.frameworks
          });
          if (rule.regex.lastIndex === match.index) rule.regex.lastIndex++;
        }
      }
    }

    // 3. Auxiliary Check B: Base64 decoding scan
    const b64Scan = this.scanBase64Payloads(text);

    if (matches.length === 0 && b64Scan.categories.length === 0) {
      return {
        piiDetected: false,
        redactedText: text,
        detectedCategories: [],
        violatedFrameworks: [],
        riskLevel: 'low'
      };
    }

    // 4. Overlap safety: Sort matches by starting index, filter out overlapping matches
    matches.sort((a, b) => a.start - b.start);
    const activeMatches: PIIMatch[] = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.start >= lastEnd) {
        activeMatches.push(match);
        lastEnd = match.end;
      }
    }

    // 5. Index-shift protection: Replace from right to left (descending order)
    activeMatches.sort((a, b) => b.start - a.start);
    let redactedText = text;
    const detectedCategoriesSet = new Set<string>(b64Scan.categories);
    const violatedFrameworksSet = new Set<string>(b64Scan.frameworks);
    let overallRisk: 'low' | 'medium' | 'high' = b64Scan.categories.length > 0 ? 'medium' : 'low';

    for (const match of activeMatches) {
      if (match.start >= 0 && match.end <= redactedText.length && match.start < match.end) {
        redactedText = redactedText.substring(0, match.start) + match.redactedLabel + redactedText.substring(match.end);
      }
      
      detectedCategoriesSet.add(match.category);
      match.frameworks.forEach(f => violatedFrameworksSet.add(f));

      const rule = this.PATTERNS[match.category];
      if (rule && rule.risk === 'high') {
        overallRisk = 'high';
      } else if (overallRisk !== 'high') {
        overallRisk = 'medium';
      }
    }

    return {
      piiDetected: true,
      redactedText,
      detectedCategories: Array.from(detectedCategoriesSet),
      violatedFrameworks: Array.from(violatedFrameworksSet),
      riskLevel: overallRisk
    };
  }

  /**
   * Scans a full action payload (action string and metadata dictionary).
   * Aggregates findings and returns a single redacted result.
   */
  public static scanPayload(action: string, metadata: any): PIIScanResult {
    const actionScan = this.scan(action || '');
    const metaTexts = this.extractTextFields(metadata);
    const allTexts = [action, ...metaTexts].filter(Boolean);
    const combinedText = allTexts.join(' | ');
    const combinedScan = this.scan(combinedText);

    return {
      piiDetected: combinedScan.piiDetected,
      redactedText: actionScan.redactedText,
      detectedCategories: combinedScan.detectedCategories,
      violatedFrameworks: combinedScan.violatedFrameworks,
      riskLevel: combinedScan.riskLevel
    };
  }

  /**
   * Recursively extracts text values from specific fields ('prompt', 'content', 'message', 'input', 'text').
   */
  private static extractTextFields(obj: any): string[] {
    const fields: string[] = [];
    const targetKeys = new Set(['prompt', 'content', 'message', 'input', 'text']);
    
    function recurse(current: any) {
      if (!current) return;
      if (typeof current === 'object') {
        if (Array.isArray(current)) {
          for (const item of current) {
            recurse(item);
          }
        } else {
          for (const key of Object.keys(current)) {
            const val = current[key];
            if (targetKeys.has(key) && typeof val === 'string') {
              fields.push(val);
            }
            recurse(val);
          }
        }
      }
    }
    
    recurse(obj);
    return fields;
  }
}
