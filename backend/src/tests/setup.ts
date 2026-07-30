console.log('--- TEST SETUP LOADED ---');
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mohammadfaazilzia@localhost:5432/sentra_jest_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'mock_jwt_secret_1234567890';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mock_jwt_refresh_secret_1234567890';
jest.mock('ioredis', () => {
  const { EventEmitter } = require('events');
  class MockRedis extends EventEmitter {
    get = jest.fn().mockResolvedValue(null);
    set = jest.fn().mockResolvedValue('OK');
    del = jest.fn().mockResolvedValue(1);
    ping = jest.fn().mockResolvedValue('PONG');
    disconnect = jest.fn();
    quit = jest.fn().mockResolvedValue(undefined);
  }
  const mockRedisFn: any = jest.fn().mockImplementation(() => new MockRedis());
  mockRedisFn.default = mockRedisFn;
  return mockRedisFn;
});

jest.mock('../utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    logRequest: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    ...mockLogger,
  };
});

jest.mock('../services/alert.service', () => ({
  alertService: {
    notify: jest.fn().mockReturnValue(undefined),
    sendEmailAlert: jest.fn().mockResolvedValue(undefined),
    sendSlackAlert: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/semanticRiskEngine', () => ({
  evaluateSemanticRisk: jest.fn().mockResolvedValue({
    score: 'low',
    categories: [],
    explanation: 'Mocked safe semantic result',
    confidence: 0.95,
  }),
  evaluateMemoryWriteAnomaly: jest.fn().mockImplementation(async (content: string) => {
    if (!content) return { isAnomaly: false };
    const lower = content.toLowerCase();
    if (lower.includes('system instruction') || lower.includes('ignore all previous') || lower.includes('bypass security')) {
      return { isAnomaly: true, reason: 'Memory write contains indirect prompt injection signature.' };
    }
    return { isAnomaly: false };
  }),
}));

jest.mock('../services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn().mockImplementation((key, fetchFn) => fetchFn()),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),
  },
}));
