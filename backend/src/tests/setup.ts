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
