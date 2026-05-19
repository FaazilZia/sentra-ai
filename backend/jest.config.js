module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageProvider: 'v8',
  maxWorkers: 2,
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
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
