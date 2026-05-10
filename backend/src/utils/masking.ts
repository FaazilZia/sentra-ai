import crypto from 'crypto';

/**
 * Enterprise Anonymization & De-identification Service
 * Supports context-aware masking and deterministic tokenization for security audits.
 */

interface MaskingOptions {
  salt?: string;
  deterministic?: boolean;
}

export const anonymizeText = (text: string | null, options: MaskingOptions = {}): string => {
  if (!text) return "";
  
  let result = text;
  const salt = options.salt || process.env.MASKING_SALT || 'default-sentra-salt';

  // 1. Precise Email Masking: user@domain.com -> u***@domain.com
  const emailRegex = /\b([a-zA-Z0-9._%+-])[^@]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  result = result.replace(emailRegex, (match, p1, p2) => {
    return options.deterministic 
      ? `[EMAIL_${hashString(match, salt)}]` 
      : `${p1}***${p2}`;
  });

  // 2. Financial / Card Masking: 1234-5678-9012-3456 -> ****-****-****-3456
  const cardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
  result = result.replace(cardRegex, (match) => {
    const clean = match.replace(/[- ]/g, '');
    const last4 = clean.slice(-4);
    return `****-****-****-${last4}`;
  });

  // 3. Identification Masking (SSN/Passports)
  const idRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  result = result.replace(idRegex, "[ID_REDACTED]");

  // 4. Phone Number Masking
  const phoneRegex = /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g;
  result = result.replace(phoneRegex, "[PHONE_REDACTED]");

  return result;
};

/**
 * Deterministic hash for consistent tokenization (useful for audit correlation)
 */
function hashString(input: string, salt: string): string {
  return crypto
    .createHmac('sha256', salt)
    .update(input)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
}

// Backward compatibility with legacy maskPII call
export const maskPII = (text: string | null): string => anonymizeText(text);
