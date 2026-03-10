/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { useESM: false }] },
  moduleNameMapper: {
    '^(\\.\\./.*)\\.js$': '$1',
    '^(\\./.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['/node_modules/(?!@ai-governance)'],
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!**/*.d.ts', '!**/generated/**'],
  coverageDirectory: 'coverage',
  passWithNoTests: true,
};
