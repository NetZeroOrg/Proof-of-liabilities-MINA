#!/usr/bin/env node
/**
 * This script has the following functionalities
 *
 * the .env file should have
 * REDIS_URL or defauls to "redis://localhost:6379"
 *
 * DEPLOYER_PRIVATE_KEY
 * CONTRACT_ADDRESS for the liabilities contract
 *
 * 1. Read user_data.csv and convert it into a `DbRecord` object
 * 2. Create a tree from the `DbRecord` object
 * 3. Save the tree to a Redis database
 * 4. Save the root proof to a JSON file
 * 5. Submit the new root commitment and parameters to the contracts
 */
export declare function createTreeAndSetContracts(userDataFile: string, redisConnectionURL?: string): Promise<void>;
//# sourceMappingURL=createAndDeployScript.d.ts.map