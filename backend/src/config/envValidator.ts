import logger from '../utils/logger';

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const COMMON_PLACEHOLDERS = new Set([
  'secret',
  'jwt_secret',
  'refresh_secret',
  'encryption_key',
  'password',
  'changeme',
  'placeholder',
  'test-secret',
  'test-secret-for-ci',
  'test-refresh-secret-for-ci',
  'default',
  '123456',
  '12345678',
  'admin',
  'your_jwt_secret',
  'your_secret_key',
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // common test/dummy key
]);

const MIN_SECRET_LENGTH = 32;
const MIN_METRICS_TOKEN_LENGTH = 16;

/**
 * Checks whether a secret is considered weak due to length, common placeholder, or low entropy pattern.
 */
export function isWeakSecret(val: string, minLength: number = MIN_SECRET_LENGTH): boolean {
  if (!val || val.trim().length < minLength) {
    return true;
  }
  const normalized = val.trim().toLowerCase();
  if (COMMON_PLACEHOLDERS.has(normalized)) {
    return true;
  }
  if (/^(.)\1+$/.test(normalized)) {
    // Repeated single character like 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    return true;
  }
  if (/placeholder|changeme|example|your_secret|test-secret|dummy/i.test(normalized)) {
    return true;
  }
  return false;
}

/**
 * Validates database connection URL structure without exposing credentials.
 */
export function isInvalidDatabaseUrl(url?: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  const trimmed = url.trim();
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return true;
  }
  if (/example|placeholder|changeme/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Validates redis connection URL structure.
 */
export function isInvalidRedisUrl(url?: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  const trimmed = url.trim();
  if (!trimmed.startsWith('redis://') && !trimmed.startsWith('rediss://')) {
    return true;
  }
  if (/example|placeholder|changeme/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Pure validator function for production environment security posture.
 * Returns valid status, list of errors (blocking), and list of warnings.
 */
export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Mandatory variables check (Missing or Weak)
  // JWT_SECRET
  if (!env.JWT_SECRET || env.JWT_SECRET.trim() === '') {
    errors.push('JWT_SECRET is missing. A cryptographically secure secret (min 32 chars) is required.');
  } else if (isWeakSecret(env.JWT_SECRET, MIN_SECRET_LENGTH)) {
    errors.push(`JWT_SECRET is weak. It must be at least ${MIN_SECRET_LENGTH} characters and not a known placeholder.`);
  }

  // REFRESH_SECRET
  if (!env.REFRESH_SECRET || env.REFRESH_SECRET.trim() === '') {
    errors.push('REFRESH_SECRET is missing. A cryptographically secure secret (min 32 chars) is required.');
  } else if (isWeakSecret(env.REFRESH_SECRET, MIN_SECRET_LENGTH)) {
    errors.push(`REFRESH_SECRET is weak. It must be at least ${MIN_SECRET_LENGTH} characters and not a known placeholder.`);
  }

  // ENCRYPTION_KEY
  if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.trim() === '') {
    errors.push('ENCRYPTION_KEY is missing. AES-256 requires a 32-byte key (min 32 chars or 64 hex characters).');
  } else if (isWeakSecret(env.ENCRYPTION_KEY, MIN_SECRET_LENGTH)) {
    errors.push(`ENCRYPTION_KEY is weak. It must be at least ${MIN_SECRET_LENGTH} characters and not a known placeholder.`);
  }

  // DATABASE_URL
  const dbUrl = env.DATABASE_URL || env.DIRECT_URL;
  if (!dbUrl || dbUrl.trim() === '') {
    errors.push('DATABASE_URL is missing. A valid postgresql:// connection URL is required.');
  } else if (isInvalidDatabaseUrl(dbUrl)) {
    errors.push('DATABASE_URL is invalid or uses a placeholder. It must begin with postgres:// or postgresql://.');
  }

  // REDIS_URL
  if (!env.REDIS_URL || env.REDIS_URL.trim() === '') {
    errors.push('REDIS_URL is missing. A valid redis:// or rediss:// connection URL is required in production.');
  } else if (isInvalidRedisUrl(env.REDIS_URL)) {
    errors.push('REDIS_URL is invalid or uses a placeholder. It must begin with redis:// or rediss://.');
  }

  // METRICS_SECRET_TOKEN
  if (!env.METRICS_SECRET_TOKEN || env.METRICS_SECRET_TOKEN.trim() === '') {
    errors.push('METRICS_SECRET_TOKEN is missing. A secure bearer token (min 16 chars) is required to protect /metrics.');
  } else if (isWeakSecret(env.METRICS_SECRET_TOKEN, MIN_METRICS_TOKEN_LENGTH)) {
    errors.push(`METRICS_SECRET_TOKEN is weak. It must be at least ${MIN_METRICS_TOKEN_LENGTH} characters and not a known placeholder.`);
  }

  // 2. Dangerous production flags that must cause startup refusal
  // NODE_TLS_REJECT_UNAUTHORIZED === '0'
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    errors.push('Refusing to start in production: NODE_TLS_REJECT_UNAUTHORIZED is set to "0". TLS certificate validation must never be disabled in production.');
  }

  // ALLOW_CUSTOM_DB_PORTS === 'true'
  const allowCustomPorts = env.ALLOW_CUSTOM_DB_PORTS?.toLowerCase();
  if (allowCustomPorts === 'true' || allowCustomPorts === '1' || allowCustomPorts === 'yes') {
    errors.push('Refusing to start in production: ALLOW_CUSTOM_DB_PORTS is set to true. Custom database ports pose an SSRF risk and are prohibited in production.');
  }

  // FRONTEND_URL check
  if (!env.FRONTEND_URL || env.FRONTEND_URL.trim() === '') {
    errors.push('FRONTEND_URL is missing. A valid frontend origin is required in production for CORS and Secure Cookie policies.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Asserts startup security posture.
 * In production mode (`NODE_ENV === 'production'`), throws a descriptive Error if any rule fails.
 * In non-production environments, logs warnings for any detected weakness.
 */
export function assertStartupEnv(env: NodeJS.ProcessEnv = process.env): void {
  const isProduction = env.NODE_ENV === 'production';
  const result = validateProductionEnv(env);

  if (isProduction) {
    if (!result.valid) {
      const banner = '='.repeat(70);
      logger.error(`\n${banner}\n[STARTUP FATAL] Production Environment Hardening Failure:\n${result.errors.map(e => `  ❌ ${e}`).join('\n')}\n${banner}\n`);
      throw new Error(`Production environment validation failed:\n${result.errors.join('\n')}`);
    }
  } else {
    // Non-production: log warnings if missing or weak
    if (!result.valid) {
      logger.warn(`[DEV/TEST WARNING] Environment validation issues detected (non-blocking in ${env.NODE_ENV || 'development'}):`);
      result.errors.forEach(e => logger.warn(`  ⚠️ ${e}`));
    }
  }
}
