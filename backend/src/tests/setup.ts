console.log('--- TEST SETUP LOADED ---');

// Mock performance globally for Node environments that don't have it
if (typeof performance === 'undefined') {
  (global as any).performance = { now: jest.fn(() => Date.now()) };
}

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      on: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      disconnect: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    };
  });
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  }
}));

jest.mock('../services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
    invalidate: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue(true),
  },
}));

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
}));
