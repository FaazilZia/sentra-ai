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
      regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      redactedLabel: '[EMAIL_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    PHONE: {
      regex: /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
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
      regex: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,
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
      regex: /\b(?:key|api|token|secret)[a-z0-9_]{10,60}\b/gi,
      redactedLabel: '[API_KEY_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    JWT_TOKEN: {
      regex: /\beyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\b/g,
      redactedLabel: '[JWT_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    AWS_KEY: {
      regex: /\bAKIA[0-9A-Z]{16}\b/g,
      redactedLabel: '[AWS_KEY_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    IP_ADDRESS: {
      regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      redactedLabel: '[IP_REDACTED]',
      frameworks: ['GDPR', 'DPDP', 'HIPAA'],
      risk: 'medium'
    },
    STREET_ADDRESS: {
      regex: /\b\d{1,6}\s{1,3}(?:[A-Za-z0-9#'.\-]+\s{1,3}){1,8}(?:Street|St|Avenue|Ave|Road|Rd|Highway|Hwy|Boulevard|Blvd|Court|Ct|Drive|Dr|Lane|Ln|Way)\b/gi,
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
    }
  };

  /**
   * Scans a single string for any of the 14 PII categories.
   * Employs index-shift protection (descending index replacements) and overlap safety.
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

    // 1. Gather all potential matches across all regexes
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

        // Prevent infinite loops if regex matches empty string
        if (rule.regex.lastIndex === match.index) {
          rule.regex.lastIndex++;
        }
      }
    }

    if (matches.length === 0) {
      return {
        piiDetected: false,
        redactedText: text,
        detectedCategories: [],
        violatedFrameworks: [],
        riskLevel: 'low'
      };
    }

    // 2. Overlap safety: Sort matches by starting index, filter out overlapping matches
    matches.sort((a, b) => a.start - b.start);
    const activeMatches: PIIMatch[] = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.start >= lastEnd) {
        activeMatches.push(match);
        lastEnd = match.end;
      }
    }

    // 3. Index-shift protection: Replace from right to left (descending order)
    activeMatches.sort((a, b) => b.start - a.start);
    let redactedText = text;
    const detectedCategoriesSet = new Set<string>();
    const violatedFrameworksSet = new Set<string>();
    let overallRisk: 'low' | 'medium' | 'high' = 'low';

    for (const match of activeMatches) {
      // Perform redaction
      redactedText = redactedText.substring(0, match.start) + match.redactedLabel + redactedText.substring(match.end);
      
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
    // A. Scan action specifically for its redacted version
    const actionScan = this.scan(action || '');

    // B. Extract other text fields from metadata and combine
    const metaTexts = this.extractTextFields(metadata);
    const allTexts = [action, ...metaTexts].filter(Boolean);
    const combinedText = allTexts.join(' | ');

    // C. Scan combined text for overall PII presence, categories, frameworks, and risk level
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

  /**
   * Redacts all PII patterns from a plain string.
   */
  static redact(text: string): string {
    if (!text || typeof text !== 'string') return text || '';
    return this.scan(text).redactedText;
  }

  /**
   * Recursively traverses an object/array and redacts PII from all string values.
   */
  static redactDeep<T = any>(data: T): T {
    if (typeof data === 'string') {
      return this.redact(data) as unknown as T;
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.redactDeep(item)) as unknown as T;
    }
    if (data && typeof data === 'object') {
      const copy: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        copy[key] = this.redactDeep(value);
      }
      return copy as T;
    }
    return data;
  }
}

