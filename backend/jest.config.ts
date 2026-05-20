module.exports = {
  globalSetup: '<rootDir>/src/tests/globalSetup.ts',
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageProvider: 'v8',
  maxWorkers: 2,
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'tests/e2e/dashboard.test.ts', // Playwright only — run via: npx playwright test
  ],
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  moduleNameMapper: {
    // Mock the queue module in CI where Redis/p-queue timers cause worker leaks
    '^../config/queue$': '<rootDir>/src/__mocks__/config/queue.ts',
    '^../../config/queue$': '<rootDir>/src/__mocks__/config/queue.ts',
    '^../../../config/queue$': '<rootDir>/src/__mocks__/config/queue.ts',
  },
  collectCoverageFrom: [
    'src/services/decisionEngine.ts',
    'src/services/policyEngine.ts',
    'src/services/riskEngine.ts',
    'src/utils/masking.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 50,
      lines: 75,
      functions: 85,
    },
  },
};
