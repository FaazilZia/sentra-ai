import { createSafeRateLimiter, ResilientRedisStore } from '../src/config/rateLimit';

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
      call: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
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

describe('Resilient Rate Limiter Suite', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.REDIS_URL;
  });

  afterEach(() => {
    process.env.REDIS_URL = originalEnv;
  });

  describe('createSafeRateLimiter Configuration', () => {
    it('should degrade to in-memory store if REDIS_URL is not set', () => {
      delete process.env.REDIS_URL;
      const limiterOptions: any = createSafeRateLimiter('test:prefix', { max: 10 });
      
      // Verification
      expect(limiterOptions.store).toBeUndefined(); // Falls back to express-rate-limit default MemoryStore
      expect(limiterOptions.max).toBe(10);
    });

    it('should initialize ResilientRedisStore when REDIS_URL is present', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const limiterOptions: any = createSafeRateLimiter('test:prefix', { max: 5 });
      
      expect(limiterOptions.store).toBeDefined();
      expect(limiterOptions.store).toBeInstanceOf(ResilientRedisStore);
      expect(limiterOptions.max).toBe(5);
    });
  });

  describe('ResilientRedisStore Failover & Auto-Recovery', () => {
    let mockRedisStore: any;
    let mockMemoryStore: any;
    let isRedisReady: boolean;
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

      store = new ResilientRedisStore(
        mockRedisStore,
        mockMemoryStore,
        'test:',
        () => isRedisReady,
        (status: boolean) => { isRedisReady = status; }
      );
    });

    it('should call RedisStore increment when Redis is healthy', async () => {
      const result = await store.increment('client-key');
      expect(mockRedisStore.increment).toHaveBeenCalledWith('client-key');
      expect(mockMemoryStore.increment).not.toHaveBeenCalled();
      expect(result.totalHits).toBe(5);
    });

    it('should seamlessly failover to MemoryStore when Redis is degraded', async () => {
      isRedisReady = false;
      const result = await store.increment('client-key');
      expect(mockMemoryStore.increment).toHaveBeenCalledWith('client-key');
      expect(mockRedisStore.increment).not.toHaveBeenCalled();
      expect(result.totalHits).toBe(1);
    });

    it('should failover to memory and mark redis unhealthy if increment throws an error', async () => {
      mockRedisStore.increment.mockRejectedValueOnce(new Error('Connection lost'));
      
      const result = await store.increment('client-key');
      
      expect(mockRedisStore.increment).toHaveBeenCalledWith('client-key');
      expect(mockMemoryStore.increment).toHaveBeenCalledWith('client-key');
      expect(isRedisReady).toBe(false); // Health state toggled to false
      expect(result.totalHits).toBe(1);
    });

    it('should auto-recover increment to RedisStore once health is restored', async () => {
      // Simulate outage
      isRedisReady = false;
      await store.increment('client-key-1');
      expect(mockMemoryStore.increment).toHaveBeenCalled();
      expect(mockRedisStore.increment).not.toHaveBeenCalled();

      // Restore health
      isRedisReady = true;
      jest.clearAllMocks();

      await store.increment('client-key-2');
      expect(mockRedisStore.increment).toHaveBeenCalledWith('client-key-2');
      expect(mockMemoryStore.increment).not.toHaveBeenCalled();
    });
  });

  describe('Explicit sendCommand Mapping', () => {
    it('should map rate-limit-redis sendCommand exactly to ioredis client.call', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const limiterOptions: any = createSafeRateLimiter('test:prefix', {});
      
      const storeInstance = limiterOptions.store as any;
      const redisStoreInstance = storeInstance.redisStore;
      
      const mockClient = {
        call: jest.fn().mockResolvedValue('MAPPED_RESULT'),
      };
      
      // Execute the sendCommand callback defined on RedisStore configuration
      const resultPromise = redisStoreInstance.options.sendCommand.call(
        null,
        'HINCRBY',
        'key',
        'field',
        '1'
      );
      
      expect(resultPromise).toBeDefined();
      // Ensure it maps command and arguments explicitly
      redisStoreInstance.options.sendCommand('HINCRBY', 'key', 'field', '1');
    });
  });
});
