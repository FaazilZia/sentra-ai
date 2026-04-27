console.log('--- TEST SETUP LOADED ---');
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      on: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      disconnect: jest.fn(),
    };
  });
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
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
