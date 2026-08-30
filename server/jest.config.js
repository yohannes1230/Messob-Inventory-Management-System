/** @type {import('ts-jest').JestConfigWithTsJest} */
const jestConfig = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@am-pms/shared-constants$': '<rootDir>/../packages/shared-constants/src/index.ts',
    '^@am-pms/shared-types$': '<rootDir>/../packages/shared-types/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
        isolatedModules: true,
        diagnostics: {
          ignoreCodes: [6059, 151002],
        },
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  testTimeout: 60000,
};

export default jestConfig;
