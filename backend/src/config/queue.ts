import PQueue from 'p-queue';

// Global queue for OpenAI calls
export const aiQueue = new PQueue({ concurrency: 10 });

// Map to track per-organization concurrency
const orgConcurrency = new Map<string, number>();
const MAX_PER_ORG = 3;

/**
 * Fair concurrency wrapper.
 * Ensures no single organization can monopolize the global queue.
 */
export const runFairly = async <T>(orgId: string, task: () => Promise<T>): Promise<T> => {
  return aiQueue.add(async () => {
    const current = orgConcurrency.get(orgId) || 0;
    
    if (current >= MAX_PER_ORG) {
      throw new Error(`Organization ${orgId} has reached max concurrent AI requests (${MAX_PER_ORG}).`);
    }

    orgConcurrency.set(orgId, current + 1);
    
    try {
      return await task();
    } finally {
      const updated = orgConcurrency.get(orgId) || 1;
      orgConcurrency.set(orgId, Math.max(0, updated - 1));
    }
  }) as Promise<T>;
};
