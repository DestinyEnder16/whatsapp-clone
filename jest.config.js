module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  // Mirror the "@/*" path alias from tsconfig.json
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/*.test.[jt]s?(x)',
    '<rootDir>/src/**/*.spec.[jt]s?(x)',
    '<rootDir>/__tests__/**/*.[jt]s?(x)',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/*.d.ts',
  ],
};
