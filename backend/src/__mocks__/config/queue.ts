// Mock queue service for CI/test environments where Redis is unavailable
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
