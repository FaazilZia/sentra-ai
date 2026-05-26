// Intentional: BullMQ requires a Redis connection unavailable in CI.
// All queue-dependent services are tested via integration tests against
// a real DB; queue dispatch is verified by checking the mock was called.
export const runFairly = jest.fn().mockImplementation(
  async (_orgId: string, fn: () => Promise<any>) => fn()
);

export const aiQueue = {
  add: jest.fn().mockImplementation(async (fn: () => Promise<any>) => fn()),
  size: 0,
  pending: 0,
};

export const getQueueMetrics = jest.fn().mockResolvedValue({
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
});
