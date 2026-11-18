import { randomInt } from 'node:crypto';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*-_';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

const CI_ENV_VARS = [
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'CIRCLECI',
  'BUILDKITE',
  'JENKINS_URL',
  'TF_BUILD',
] as const;

export interface ResolvedSeedPassword {
  password: string;
  source: 'env' | 'generated';
  shouldLogOnce: boolean;
}

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'false' && normalized !== '0';
}

export function isCIEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return CI_ENV_VARS.some((key) => isTruthyFlag(env[key]));
}

/**
 * Generates a cryptographically random password guaranteed to satisfy
 * uppercase, lowercase, digit, and special-character requirements.
 */
export function generateSecureSeedPassword(length = 24): string {
  const targetLength = Math.max(length, 16);
  const chars: string[] = [
    UPPERCASE[randomInt(UPPERCASE.length)],
    LOWERCASE[randomInt(LOWERCASE.length)],
    DIGITS[randomInt(DIGITS.length)],
    SPECIAL[randomInt(SPECIAL.length)],
  ];

  for (let i = chars.length; i < targetLength; i++) {
    chars.push(ALL_CHARS[randomInt(ALL_CHARS.length)]);
  }

  // Fisher-Yates shuffle using crypto.randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}

/**
 * Resolves the admin password for prisma/seed.ts:
 * - Reads SEED_ADMIN_PASSWORD (or TEST_ADMIN_PASSWORD) when provided.
 * - Otherwise generates a fresh cryptographically random password per run.
 * - Permits printing the generated password ONCE only in local dev
 *   (never in CI logs, production, or automated test runs).
 */
export function resolveSeedAdminPassword(
  env: NodeJS.ProcessEnv = process.env
): ResolvedSeedPassword {
  const configured = env.SEED_ADMIN_PASSWORD?.trim() || env.TEST_ADMIN_PASSWORD?.trim();
  if (configured) {
    return {
      password: configured,
      source: 'env',
      shouldLogOnce: false,
    };
  }

  const shouldLogOnce =
    !isCIEnvironment(env) &&
    env.NODE_ENV !== 'production' &&
    env.NODE_ENV !== 'test';

  return {
    password: generateSecureSeedPassword(),
    source: 'generated',
    shouldLogOnce,
  };
}
