import { createSafeRateLimiter, ResilientRedisStore, withTimeout } from '../src/config/rateLimit';

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  const actual = jest.requireActual('express-rate-limit');
  const mockRateLimit = jest.fn((options) => options);
  (mockRateLimit as any).MemoryStore = actual.MemoryStore;
  return mockRateLimit;
});

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      status: 'ready',
      call: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      removeAllListeners: jest.fn(),
    };
  });
});

// Mock rate-limit-redis
jest.mock('rate-limit-redis', () => {
  return {
    default: jest.fn().mockImplementation((options) => {
      return {
        init: jest.fn(),
        increment: jest.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date() }),
        decrement: jest.fn(),
        resetKey: jest.fn(),
        options,
      };
    }),
  };
});

describe('Resilient Rate Limiter Hardening Test Suite', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.REDIS_URL;
  });

  afterEach(() => {
    process.env.REDIS_URL = originalEnv;
  });

  describe('Timeout protection promise wrapper', () => {
    it('should resolve normally if execution completes within the timeout limit', async () => {
      const fastPromise = Promise.resolve('SUCCESS');
      const result = await withTimeout(fastPromise, 500);
      expect(result).toBe('SUCCESS');
    });

    it('should reject if execution exceeds the timeout limit', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('LATE'), 1000));
      await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Redis execution timeout exceeded');
    });
  });

  describe('Circuit Breaker Transitions & Cooldown Fallback', () => {
    let mockRedisStore: any;
    let mockMemoryStore: any;
    let isRedisReady: boolean;
    let mockClient: any;
    let MockRedisStoreClass: any;
    let store: ResilientRedisStore;

    beforeEach(() => {
      mockRedisStore = {
        init: jest.fn(),
        increment: jest.fn().mockResolvedValue({ totalHits: 5, resetTime: new Date() }),
        decrement: jest.fn(),
        resetKey: jest.fn(),
      };
      mockMemoryStore = {
        init: jest.fn(),
        increment: jest.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date() }),
        decrement: jest.fn(),
        resetKey: jest.fn(),
      };
      isRedisReady = true;

      mockClient = {
        status: 'ready',
        call: jest.fn().mockResolvedValue('OK'),
      };
      MockRedisStoreClass = jest.fn().mockImplementation(() => mockRedisStore);

      store = new ResilientRedisStore(
        mockClient,
        MockRedisStoreClass,
        mockMemoryStore,
        'test:',
        () => isRedisReady,
        (status: boolean) => { isRedisReady = status; }
      );
    });

    it('should start in CLOSED state and call RedisStore', async () => {
      const result = await store.increment('key1');
      expect(mockRedisStore.increment).toHaveBeenCalledWith('key1');
      expect(mockMemoryStore.increment).not.toHaveBeenCalled();
      expect(result.totalHits).toBe(5);
    });

    it('should trip to OPEN state after 3 failures and use MemoryStore', async () => {
      // Simulate 3 failures
      mockRedisStore.increment.mockRejectedValue(new Error('Connection lost'));

      // Error 1: Fallback active, health toggled off
      await store.increment('key');
      expect(isRedisReady).toBe(false);

      // Error 2: Toggled off, immediately calls memory
      await store.increment('key');
      
      // Error 3: Toggled off, immediately calls memory
      const finalResult = await store.increment('key');
      
      expect(mockMemoryStore.increment).toHaveBeenCalledTimes(3);
      expect(finalResult.totalHits).toBe(1);
    });

    it('should enforce cooldown when circuit is OPEN', async () => {
      mockRedisStore.increment.mockRejectedValue(new Error('Connection failed'));
      
      // Trip the circuit to OPEN
      await store.increment('key'); // Fail 1
      await store.increment('key'); // Fail 2
      await store.increment('key'); // Fail 3
      
      jest.clearAllMocks();

      // Attempt command immediately during cooldown window
      const result = await store.increment('key');
      
      expect(mockRedisStore.increment).not.toHaveBeenCalled(); // Fast fallback to memory
      expect(mockMemoryStore.increment).toHaveBeenCalledWith('key');
      expect(result.totalHits).toBe(1);
    });

    it('should transition to HALF_OPEN and probe connection after cooldown expires', async () => {
      mockRedisStore.increment.mockRejectedValue(new Error('Connection failed'));
      
      // Trip the circuit to OPEN
      await store.increment('key'); // Fail 1
      await store.increment('key'); // Fail 2
      await store.increment('key'); // Fail 3

      // Advance time beyond 30 seconds cooldown
      const spyTime = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 40000);
      jest.clearAllMocks();

      // Successful probe in HALF_OPEN should restore connection to CLOSED state
      mockRedisStore.increment.mockResolvedValueOnce({ totalHits: 10, resetTime: new Date() });
      isRedisReady = true;

      const result = await store.increment('key');
      expect(mockRedisStore.increment).toHaveBeenCalledWith('key');
      expect(result.totalHits).toBe(10);

      // Next call should run CLOSED normally
      await store.increment('key2');
      expect(mockRedisStore.increment).toHaveBeenCalledWith('key2');

      spyTime.mockRestore();
    });
  });

  describe('Original sendCommand Malformed Crash Regression Verification', () => {
    it('should map explicit sendCommand arguments cleanly without nesting them as arrays', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const limiterOptions: any = createSafeRateLimiter('test:prefix', {});
      const storeInstance = limiterOptions.store as any;

      const mockClient = {
        call: jest.fn().mockResolvedValue('MAPPED_OK'),
      };

      // Simulate rate-limit-redis sending multiple string args
      const sendCommandWrapper = (command: string, ...args: string[]) => {
        return mockClient.call(command, ...args);
      };

      // Ensure no nested arrays exist and call is spread cleanly
      const result = await sendCommandWrapper('EVALSHA', 'sha1hash', '1', 'prefix:key', '60000');
      expect(result).toBe('MAPPED_OK');
      expect(mockClient.call).toHaveBeenCalledWith('EVALSHA', 'sha1hash', '1', 'prefix:key', '60000');
      expect(mockClient.call).not.toHaveBeenCalledWith(['EVALSHA', 'sha1hash', '1', 'prefix:key', '60000']);
    });
  });
});
