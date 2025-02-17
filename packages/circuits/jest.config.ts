import type { Config } from 'jest';

const config: Config = {
    verbose: true,
    rootDir: "./",
    moduleDirectories: ["test"],
    testPathIgnorePatterns: ["dist"],
    extensionsToTreatAsEsm: ['.ts'],
    testTimeout: 30_000,
    setupFilesAfterEnv: ["jest-expect-message"],
    moduleNameMapper: {
        'o1js/dist/(.*)': '<rootDir>/node_modules/o1js/dist/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
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