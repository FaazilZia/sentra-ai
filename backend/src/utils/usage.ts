import prisma from '../config/db';
import logger from './logger';
import { getRedisClient } from '../config/redis';

// OpenAI gpt-4o-mini pricing as of now (approximate)
// $0.150 / 1M input tokens
// $0.600 / 1M output tokens
const INPUT_RATE = 0.150 / 1_000_000;
const OUTPUT_RATE = 0.600 / 1_000_000;

export const trackUsage = async (
  organizationId: string,
  promptTokens: number,
  completionTokens: number
) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  const tokensUsed = promptTokens + completionTokens;
  const estimatedCost = (promptTokens * INPUT_RATE) + (completionTokens * OUTPUT_RATE);

  try {
    await prisma.usage_stats.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date
        }
      },
      update: {
        requests_count: { increment: 1 },
        tokens_used: { increment: tokensUsed },
        estimated_cost: { increment: estimatedCost }
      },
      create: {
        organizationId,
        date,
        requests_count: 1,
        tokens_used: tokensUsed,
        estimated_cost: estimatedCost
      }
    });
  } catch (error) {
    logger.error(`Failed to track usage for org ${organizationId}`, error);
  }
};

export const updateApiKeyLastUsed = (apiKeyId: string) => {
  // Use setImmediate to make it non-blocking for the request lifecycle
  setImmediate(async () => {
    try {
      await prisma.api_keys.update({
        where: { id: apiKeyId },
        data: { last_used_at: new Date() }
      });
    } catch (error) {
      logger.error(`Failed to update last_used_at for API key ${apiKeyId}`, error);
    }
  });
};

export const recordSdkConnection = (organizationId: string) => {
  // Use setImmediate to keep it non-blocking for SDK request latency
  setImmediate(async () => {
    try {
      const redis = getRedisClient();
      if (redis) {
        try {
          const cached = await redis.get(`sdk_conn:${organizationId}`);
          if (cached) return;
        } catch {
          // Redis down, timeout, or unreachable — fall through to Postgres
        }
      }

      const org = await prisma.organizations.findUnique({
        where: { id: organizationId },
        select: { sdkConnectedAt: true }
      });

      if (org && !org.sdkConnectedAt) {
        await prisma.organizations.update({
          where: { id: organizationId },
          data: { sdkConnectedAt: new Date() }
        });
      }

      if (redis) {
        try {
          await redis.set(`sdk_conn:${organizationId}`, '1', 'EX', 86400);
        } catch {
          // Non-fatal: Redis down
        }
      }
    } catch (error) {
      logger.error(`Failed to record SDK connection for org ${organizationId}:`, error);
    }
  });
};

