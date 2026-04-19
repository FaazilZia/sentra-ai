/**
 * Minimal PII masking utility for enterprise compliance
 */

export const maskPII = (text: string | null): string => {
  if (!text) return "";
  
  // Mask Email: john@email.com -> j***@email.com
  const emailRegex = /([a-zA-Z0-9._%+-])[^@]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  let masked = text.replace(emailRegex, "$1***$2");
  
  // Mask Account Numbers / Sensitive IDs (Generic numeric masking)
  // Mask sequences of 8+ digits, leaving last 4
  const accountRegex = /\b\d{4,12}(\d{4})\b/g;
  masked = masked.replace(accountRegex, "****$1");
  
  return masked;
};
