import type { Config } from 'jest';

const config: Config = {
    verbose: true,
    rootDir: "./",
    moduleDirectories: ["test", "node_modules"],
    testPathIgnorePatterns: ["dist"],
    extensionsToTreatAsEsm: ['.ts'],
    testTimeout: 30_000,
    setupFilesAfterEnv: ["jest-expect-message"],
    moduleNameMapper: {
        'o1js/dist/(.*)': '<rootDir>/node_modules/o1js/dist/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    preset: 'ts-jest',
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest',
    },
};

export default config;