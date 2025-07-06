/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          target: 'ES2022',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  testMatch: ['**/src-v3/tests/**/*.test.ts'],
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: 'coverage-v3',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist-v3/',
    '/src-v3/tests/',
  ],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};