import {
  validateProductionEnv,
  assertStartupEnv,
  isWeakSecret,
  isInvalidDatabaseUrl,
  isInvalidRedisUrl,
} from '../config/envValidator';

describe('Production Startup Environment Validator', () => {
  const getValidProductionEnv = (): NodeJS.ProcessEnv => ({
    NODE_ENV: 'production',
    JWT_SECRET: 'a_very_strong_production_jwt_secret_with_more_than_32_characters_12345!',
    REFRESH_SECRET: 'a_very_strong_production_refresh_secret_with_more_than_32_characters_67890!',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64 hex / 32 bytes
    DATABASE_URL: 'postgresql://postgres_user:StrongPass123!@db.production.sentra.internal:5432/sentra_prod',
    REDIS_URL: 'rediss://default:StrongRedisPass123!@redis.production.sentra.internal:6380',
    METRICS_SECRET_TOKEN: 'metrics_super_secure_token_abcdef123456',
    FRONTEND_URL: 'https://app.sentra.ai',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
    ALLOW_CUSTOM_DB_PORTS: 'false',
  });

  it('passes validation with a completely valid production configuration', () => {
    const env = getValidProductionEnv();
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(() => assertStartupEnv(env)).not.toThrow();
  });

  // ─── Rule 1: Missing JWT_SECRET ──────────────────────────────────────────
  it('fails fast when JWT_SECRET is missing', () => {
    const env = getValidProductionEnv();
    delete env.JWT_SECRET;
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('JWT_SECRET is missing'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/JWT_SECRET is missing/);
  });

  // ─── Rule 2: Weak JWT_SECRET ─────────────────────────────────────────────
  it('fails fast when JWT_SECRET is weak (< 32 chars or placeholder)', () => {
    const envShort = getValidProductionEnv();
    envShort.JWT_SECRET = 'short_secret';
    const resultShort = validateProductionEnv(envShort);
    expect(resultShort.valid).toBe(false);
    expect(resultShort.errors.some(e => e.includes('JWT_SECRET is weak'))).toBe(true);

    const envPlaceholder = getValidProductionEnv();
    envPlaceholder.JWT_SECRET = 'test-secret-for-ci-test-secret-for-ci';
    const resultPlaceholder = validateProductionEnv(envPlaceholder);
    expect(resultPlaceholder.valid).toBe(false);
    expect(resultPlaceholder.errors.some(e => e.includes('JWT_SECRET is weak'))).toBe(true);
  });

  // ─── Rule 3: Missing REFRESH_SECRET ───────────────────────────────────────
  it('fails fast when REFRESH_SECRET is missing', () => {
    const env = getValidProductionEnv();
    delete env.REFRESH_SECRET;
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('REFRESH_SECRET is missing'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/REFRESH_SECRET is missing/);
  });

  // ─── Rule 4: Weak REFRESH_SECRET ──────────────────────────────────────────
  it('fails fast when REFRESH_SECRET is weak (< 32 chars or placeholder)', () => {
    const env = getValidProductionEnv();
    env.REFRESH_SECRET = 'weak_refresh_token_123';
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('REFRESH_SECRET is weak'))).toBe(true);
  });

  // ─── Rule 5: Missing ENCRYPTION_KEY ──────────────────────────────────────
  it('fails fast when ENCRYPTION_KEY is missing', () => {
    const env = getValidProductionEnv();
    delete env.ENCRYPTION_KEY;
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ENCRYPTION_KEY is missing'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/ENCRYPTION_KEY is missing/);
  });

  // ─── Rule 6: Weak ENCRYPTION_KEY ──────────────────────────────────────────
  it('fails fast when ENCRYPTION_KEY is weak (< 32 chars or known test key)', () => {
    const env = getValidProductionEnv();
    env.ENCRYPTION_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // known CI dummy key
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ENCRYPTION_KEY is weak'))).toBe(true);
  });

  // ─── Rule 7: Missing DATABASE_URL ────────────────────────────────────────
  it('fails fast when DATABASE_URL (and DIRECT_URL) is missing', () => {
    const env = getValidProductionEnv();
    delete env.DATABASE_URL;
    delete env.DIRECT_URL;
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('DATABASE_URL is missing'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/DATABASE_URL is missing/);
  });

  // ─── Rule 8: Weak/Invalid DATABASE_URL ───────────────────────────────────
  it('fails fast when DATABASE_URL is invalid or uses placeholder', () => {
    const env = getValidProductionEnv();
    env.DATABASE_URL = 'mysql://root:root@localhost:3306/db';
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('DATABASE_URL is invalid'))).toBe(true);

    const envPlaceholder = getValidProductionEnv();
    envPlaceholder.DATABASE_URL = 'postgresql://placeholder:changeme@localhost:5432/db';
    const resultPlaceholder = validateProductionEnv(envPlaceholder);
    expect(resultPlaceholder.valid).toBe(false);
    expect(resultPlaceholder.errors.some(e => e.includes('DATABASE_URL is invalid'))).toBe(true);
  });

  // ─── Rule 9: Missing REDIS_URL ───────────────────────────────────────────
  it('fails fast when REDIS_URL is missing', () => {
    const env = getValidProductionEnv();
    delete env.REDIS_URL;
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('REDIS_URL is missing'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/REDIS_URL is missing/);
  });

  // ─── Rule 10: Weak/Invalid REDIS_URL ─────────────────────────────────────
  it('fails fast when REDIS_URL is invalid or uses placeholder', () => {
    const env = getValidProductionEnv();
    env.REDIS_URL = 'http://localhost:6379';
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('REDIS_URL is invalid'))).toBe(true);
  });

  // ─── Rule 11: Missing METRICS_SECRET_TOKEN ───────────────────────────────
  it('fails fast when METRICS_SECRET_TOKEN is missing', () => {
    const env = getValidProductionEnv();
    delete env.METRICS_SECRET_TOKEN;
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('METRICS_SECRET_TOKEN is missing'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/METRICS_SECRET_TOKEN is missing/);
  });

  // ─── Rule 12: Weak METRICS_SECRET_TOKEN ──────────────────────────────────
  it('fails fast when METRICS_SECRET_TOKEN is weak (< 16 chars or placeholder)', () => {
    const env = getValidProductionEnv();
    env.METRICS_SECRET_TOKEN = 'short-token';
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('METRICS_SECRET_TOKEN is weak'))).toBe(true);
  });

  // ─── Rule 13: NODE_TLS_REJECT_UNAUTHORIZED=0 ─────────────────────────────
  it('refuses to start in production if NODE_TLS_REJECT_UNAUTHORIZED=0', () => {
    const env = getValidProductionEnv();
    env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('NODE_TLS_REJECT_UNAUTHORIZED is set to "0"'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/NODE_TLS_REJECT_UNAUTHORIZED/);
  });

  // ─── Rule 14: ALLOW_CUSTOM_DB_PORTS=true ─────────────────────────────────
  it('refuses to start in production if ALLOW_CUSTOM_DB_PORTS=true', () => {
    const env = getValidProductionEnv();
    env.ALLOW_CUSTOM_DB_PORTS = 'true';
    const result = validateProductionEnv(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ALLOW_CUSTOM_DB_PORTS is set to true'))).toBe(true);
    expect(() => assertStartupEnv(env)).toThrow(/ALLOW_CUSTOM_DB_PORTS/);
  });

  // ─── Helper function checks ──────────────────────────────────────────────
  it('correctly evaluates isWeakSecret, isInvalidDatabaseUrl, and isInvalidRedisUrl', () => {
    expect(isWeakSecret('', 32)).toBe(true);
    expect(isWeakSecret('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 32)).toBe(true);
    expect(isWeakSecret('password', 32)).toBe(true);
    expect(isWeakSecret('StrongRandomSecret_1234567890_ValidLength!', 32)).toBe(false);

    expect(isInvalidDatabaseUrl(undefined)).toBe(true);
    expect(isInvalidDatabaseUrl('mysql://localhost')).toBe(true);
    expect(isInvalidDatabaseUrl('postgresql://user:pass@host:5432/db')).toBe(false);

    expect(isInvalidRedisUrl(undefined)).toBe(true);
    expect(isInvalidRedisUrl('http://localhost')).toBe(true);
    expect(isInvalidRedisUrl('redis://:pass@host:6379')).toBe(false);
    expect(isInvalidRedisUrl('rediss://:pass@host:6380')).toBe(false);
  });

  // ─── Non-production mode ──────────────────────────────────────────────────
  it('does not throw in development or test mode for warnings', () => {
    const devEnv: NodeJS.ProcessEnv = {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
    };
    expect(() => assertStartupEnv(devEnv)).not.toThrow();
  });
});
