import prisma from '../config/db';
import logger from '../utils/logger';
import { getRedisClient } from '../config/redis';

const FLAG_CACHE_PREFIX = 'ff:';
const FLAG_CACHE_TTL = 60; // 1 minute

export const FeatureFlagService = {
  /**
   * Check if a feature flag is enabled, with org-level override support.
   * Resolution order: org override → global default → false
   */
  async isEnabled(flagKey: string, organizationId?: string): Promise<boolean> {
    const redis = getRedisClient();

    // Try Redis cache
    const cacheKey = `${FLAG_CACHE_PREFIX}${flagKey}:${organizationId || 'global'}`;
    if (redis) {
      const cached = await redis.get(cacheKey).catch(() => null);
      if (cached !== null) return cached === '1';
    }

    // Check org-level override
    if (organizationId) {
      const override = await prisma.feature_flag_overrides.findFirst({
        where: {
          flag: { key: flagKey },
          organizationId,
        },
        include: { flag: true },
      });

      if (override) {
        const value = override.enabled;
        if (redis) await redis.set(cacheKey, value ? '1' : '0', 'EX', FLAG_CACHE_TTL).catch(() => {});
        return value;
      }
    }

    // Global default
    const flag = await prisma.feature_flags.findUnique({ where: { key: flagKey } });
    const value = flag?.enabled ?? false;

    // Check rollout percentage if enabled
    if (value && flag?.rollout_pct && flag.rollout_pct < 100) {
      // Simple hash-based rollout
      const hash = organizationId ? hashStringToInt(organizationId) % 100 : 0;
      const inRollout = hash < flag.rollout_pct;
      if (redis) await redis.set(cacheKey, inRollout ? '1' : '0', 'EX', FLAG_CACHE_TTL).catch(() => {});
      return inRollout;
    }

    if (redis) await redis.set(cacheKey, value ? '1' : '0', 'EX', FLAG_CACHE_TTL).catch(() => {});
    return value;
  },

  async listFlags() {
    return prisma.feature_flags.findMany({
      include: { overrides: { include: { organization: { select: { name: true, slug: true } } } } },
      orderBy: { key: 'asc' },
    });
  },

  async setFlag(key: string, enabled: boolean) {
    const flag = await prisma.feature_flags.upsert({
      where: { key },
      create: { key, name: key, enabled, rollout_pct: enabled ? 100 : 0 },
      update: { enabled, rollout_pct: enabled ? 100 : 0 },
    });

    // Invalidate cache for this flag
    const redis = getRedisClient();
    if (redis) {
      await redis.keys(`${FLAG_CACHE_PREFIX}${key}:*`)
        .then((keys) => keys.length ? redis.del(...keys) : null)
        .catch(() => {});
    }

    return flag;
  },

  async setOrgOverride(flagKey: string, organizationId: string, enabled: boolean) {
    const flag = await prisma.feature_flags.findUnique({ where: { key: flagKey } });
    if (!flag) throw new Error(`Feature flag '${flagKey}' not found`);

    const result = await prisma.feature_flag_overrides.upsert({
      where: { flag_id_organizationId: { flag_id: flag.id, organizationId } },
      create: { flag_id: flag.id, organizationId, enabled },
      update: { enabled },
    });

    const redis = getRedisClient();
    if (redis) {
      await redis.del(`${FLAG_CACHE_PREFIX}${flagKey}:${organizationId}`).catch(() => {});
    }

    return result;
  },

  async seedDefaultFlags() {
    const defaults = [
      { key: 'mfa_enforcement', name: 'MFA Enforcement', enabled: false },
      { key: 'ai_evaluation_framework', name: 'AI Evaluation Framework', enabled: true },
      { key: 'compliance_workflow', name: 'Compliance Workflow Engine', enabled: true },
      { key: 'immutable_audit', name: 'Immutable Audit Chain', enabled: true },
      { key: 'workspace_switching', name: 'Workspace Switching', enabled: true },
      { key: 'github_oauth', name: 'GitHub OAuth Login', enabled: true },
      { key: 'saml_sso', name: 'SAML SSO', enabled: false },
      { key: 'prometheus_metrics', name: 'Prometheus Metrics Export', enabled: true },
    ];

    for (const flag of defaults) {
      await prisma.feature_flags.upsert({
        where: { key: flag.key },
        create: { key: flag.key, name: flag.name, enabled: flag.enabled, rollout_pct: flag.enabled ? 100 : 0 },
        update: {},
      });
    }
    logger.info('[FeatureFlags] Default flags seeded');
  },
};

function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}
