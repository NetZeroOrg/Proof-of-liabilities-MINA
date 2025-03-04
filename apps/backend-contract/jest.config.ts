import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: "node",
  rootDir: "./",
  preset: "ts-jest",
  moduleDirectories: ["test", "node_modules"],
  testPathIgnorePatterns: ["dist"],
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 30_000,
  setupFilesAfterEnv: ["jest-expect-message"],
  moduleNameMapper: {
    'o1js/dist/(.*)': '<rootDir>/node_modules/o1js/dist/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ["/node_modules/(?!circuits)"],
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.ts?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};

export default config;