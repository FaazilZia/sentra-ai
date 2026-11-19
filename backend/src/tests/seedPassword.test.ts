import { randomUUID } from 'crypto';
import {
  generateSecureSeedPassword,
  isCIEnvironment,
  resolveSeedAdminPassword,
} from '../utils/seedPassword';

describe('seedPassword utility', () => {
  describe('generateSecureSeedPassword', () => {
    it('generates a strong password satisfying complexity requirements', () => {
      const pw = generateSecureSeedPassword();
      expect(pw.length).toBeGreaterThanOrEqual(24);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^A-Za-z0-9]/);
    });

    it('enforces a minimum length of 16 characters', () => {
      const pw = generateSecureSeedPassword(8);
      expect(pw.length).toBe(16);
    });

    it('generates distinct passwords across calls', () => {
      const first = generateSecureSeedPassword();
      const second = generateSecureSeedPassword();
      expect(first).not.toBe(second);
    });
  });

  describe('isCIEnvironment', () => {
    it('returns false when no CI variables are set', () => {
      expect(isCIEnvironment({})).toBe(false);
    });

    it('returns false for falsy flag values', () => {
      expect(isCIEnvironment({ CI: 'false', GITHUB_ACTIONS: '0', GITLAB_CI: '   ' })).toBe(false);
    });

    it('returns true when CI or GITHUB_ACTIONS is enabled', () => {
      expect(isCIEnvironment({ CI: 'true' })).toBe(true);
      expect(isCIEnvironment({ GITHUB_ACTIONS: 'true' })).toBe(true);
      expect(isCIEnvironment({ BUILDKITE: '1' })).toBe(true);
    });
  });

  describe('resolveSeedAdminPassword', () => {
    it('prefers SEED_ADMIN_PASSWORD over TEST_ADMIN_PASSWORD and never logs it', () => {
      const seedFixture = `env-${randomUUID()}`;
      const testFixture = `fallback-${randomUUID()}`;
      const result = resolveSeedAdminPassword({
        SEED_ADMIN_PASSWORD: `  ${seedFixture}  `,
        TEST_ADMIN_PASSWORD: testFixture,
        NODE_ENV: 'development',
      });
      expect(result).toEqual({
        password: seedFixture,
        source: 'env',
        shouldLogOnce: false,
      });
    });

    it('falls back to TEST_ADMIN_PASSWORD when SEED_ADMIN_PASSWORD is empty', () => {
      const testFixture = `test-${randomUUID()}`;
      const result = resolveSeedAdminPassword({
        SEED_ADMIN_PASSWORD: '   ',
        TEST_ADMIN_PASSWORD: testFixture,
        NODE_ENV: 'development',
      });
      expect(result).toEqual({
        password: testFixture,
        source: 'env',
        shouldLogOnce: false,
      });
    });

    it('generates an ephemeral password and allows logging once in local development', () => {
      const result = resolveSeedAdminPassword({ NODE_ENV: 'development' });
      expect(result.source).toBe('generated');
      expect(result.shouldLogOnce).toBe(true);
      expect(result.password.length).toBeGreaterThanOrEqual(24);
    });

    it('allows logging once when NODE_ENV and CI are unset locally', () => {
      const result = resolveSeedAdminPassword({});
      expect(result.source).toBe('generated');
      expect(result.shouldLogOnce).toBe(true);
    });

    it('suppresses logging in CI environments', () => {
      const ciResult = resolveSeedAdminPassword({ CI: 'true', NODE_ENV: 'development' });
      expect(ciResult.source).toBe('generated');
      expect(ciResult.shouldLogOnce).toBe(false);

      const ghaResult = resolveSeedAdminPassword({ GITHUB_ACTIONS: 'true' });
      expect(ghaResult.source).toBe('generated');
      expect(ghaResult.shouldLogOnce).toBe(false);
    });

    it('suppresses logging in production and test environments', () => {
      expect(resolveSeedAdminPassword({ NODE_ENV: 'production' }).shouldLogOnce).toBe(false);
      expect(resolveSeedAdminPassword({ NODE_ENV: 'test' }).shouldLogOnce).toBe(false);
    });
  });
});
