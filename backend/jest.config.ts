module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageProvider: 'v8',
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'tests/e2e/', // E2E tests require a running server — run separately via: npm run test:e2e
  ],
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  globalSetup: '<rootDir>/src/tests/dbSetup.ts',
  globalTeardown: '<rootDir>/src/tests/dbTeardown.ts',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  moduleNameMapper: {
    '^@sentra-ai/sdk$': '<rootDir>/../packages/sdk/src/index.ts',
    // Mock the queue module in CI where Redis/p-queue timers cause worker leaks
    '^../config/queue$': '<rootDir>/src/__mocks__/config/queue.ts',
    '^../../config/queue$': '<rootDir>/src/__mocks__/config/queue.ts',
    '^../../../config/queue$': '<rootDir>/src/__mocks__/config/queue.ts',
  },
  collectCoverageFrom: [
    'src/services/decisionEngine.ts',
    'src/services/policyEngine.ts',
    'src/services/riskEngine.ts',
    'src/services/search.service.ts',
    'src/services/piiScanner.service.ts',
    'src/services/policy.service.ts',
    'src/services/monitoring.service.ts',
    'src/services/notification.service.ts',
    'src/services/evidence.service.ts',
    'src/services/changeHistory.service.ts',
    'src/services/intakeForm.service.ts',
    'src/services/outcome.service.ts',
    'src/utils/ssrfProtection.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      lines: 70,
      functions: 70,
    },
  },
};
