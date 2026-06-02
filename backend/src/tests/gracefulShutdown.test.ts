import { shutdown } from '../server';
import logger from '../utils/logger';
import prisma from '../config/db';

jest.mock('../utils/logger', () => {
  const info = jest.fn();
  const error = jest.fn();
  const warn = jest.fn();
  const debug = jest.fn();
  const log = jest.fn();
  return {
    __esModule: true,
    default: { info, error, warn, debug, log },
    info,
    error,
    warn,
    debug,
    log,
  };
});

jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../config/redis', () => {
  return {
    getRedisClient: jest.fn().mockReturnValue({
      quit: jest.fn().mockResolvedValue(undefined),
    }),
    getRedisUrl: jest.fn().mockReturnValue('redis://localhost:6379'),
    buildRedisOptions: jest.fn().mockReturnValue({}),
    redisHealthCheck: jest.fn().mockResolvedValue(true),
  };
});

jest.mock('http-terminator', () => ({
  createHttpTerminator: jest.fn().mockReturnValue({
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('Graceful Shutdown Sequence', () => {
  let processExitMock: jest.SpyInstance;
  let capturedExitCode: number | undefined;

  beforeEach(() => {
    capturedExitCode = undefined;
    // Record the exit code WITHOUT throwing — throwing inside the try block
    // causes the catch handler to fire and call process.exit(1) instead.
    processExitMock = jest.spyOn(process, 'exit').mockImplementation((code) => {
      capturedExitCode = code as number;
      return undefined as never;
    });
  });

  afterEach(() => {
    processExitMock.mockRestore();
  });

  it('should run graceful shutdown on SIGTERM and call process.exit(0)', async () => {
    await shutdown('SIGTERM');

    expect(capturedExitCode).toBe(0);
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith({ signal: 'SIGTERM' }, 'Shutdown signal received');
    expect(logger.info).toHaveBeenCalledWith('Graceful shutdown complete');
  });
});
